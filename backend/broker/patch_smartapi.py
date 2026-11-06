import os
import tempfile
import logging
import urllib.request
import logzero
from SmartApi import SmartConnect
from backend.config import settings

logger = logging.getLogger(__name__)

# =====================================================================
# 1. Resolve & Cache Real Public IPv4 (Avoids SmartAPI AG7002 hardcoded IP)
# =====================================================================
_CACHED_PUBLIC_IP = None

def get_real_public_ip() -> str:
    global _CACHED_PUBLIC_IP
    if _CACHED_PUBLIC_IP:
        return _CACHED_PUBLIC_IP

    # When trading through a static-IP egress proxy, the IP Angel One sees is the
    # proxy's egress IP. Use the configured value instead of probing (which would
    # otherwise report the host IP and trigger an IP-whitelist rejection).
    static_ip = settings.angel_static_ip
    if static_ip:
        _CACHED_PUBLIC_IP = static_ip
        return static_ip

    try:
        with urllib.request.urlopen("https://api.ipify.org", timeout=2.0) as resp:
            ip = resp.read().decode("utf-8").strip()
            if ip and "." in ip:
                _CACHED_PUBLIC_IP = ip
                return ip
    except Exception:
        pass
    # Fallback to current discovered IP if external lookup fails
    return "49.43.88.126"


# =====================================================================
# 2. Patch SmartConnect.__init__ to prevent failure on read-only FS & set IP
# =====================================================================
_original_smartconnect_init = SmartConnect.__init__

def _safe_smartconnect_init(self, *args, **kwargs):
    orig_makedirs = os.makedirs
    orig_logfile = logzero.logfile

    def patched_makedirs(path, mode=0o777, exist_ok=False):
        try:
            return orig_makedirs(path, mode=mode, exist_ok=exist_ok)
        except OSError:
            tmp_path = os.path.join(tempfile.gettempdir(), "angel_logs")
            try:
                return orig_makedirs(tmp_path, mode=mode, exist_ok=exist_ok)
            except Exception:
                pass

    def patched_logfile(filename, *largs, **lkwargs):
        try:
            return orig_logfile(filename, *largs, **lkwargs)
        except Exception:
            try:
                tmp_log = os.path.join(tempfile.gettempdir(), "angel_app.log")
                return orig_logfile(tmp_log, *largs, **lkwargs)
            except Exception:
                pass

    os.makedirs = patched_makedirs
    logzero.logfile = patched_logfile
    try:
        _original_smartconnect_init(self, *args, **kwargs)
    finally:
        os.makedirs = orig_makedirs
        logzero.logfile = orig_logfile

    # Route every SmartAPI call through the configured static-IP proxy unless the
    # caller supplied its own proxy mapping.
    if not self.proxies:
        self.proxies = settings.angel_proxies or {}

    # Override hardcoded default '106.193.147.98' with the egress IP Angel One sees.
    real_ip = get_real_public_ip()
    self.clientPublicIp = real_ip
    self.clientPublicIP = real_ip

    if settings.angel_proxy_enabled:
        logger.info(
            "Angel One SmartAPI egress via %s (advertised client IP: %s)",
            settings.angel_proxy_display,
            real_ip or "unknown",
        )

SmartConnect.__init__ = _safe_smartconnect_init

# Update Class Level Defaults
real_public_ip = get_real_public_ip()
SmartConnect.clientPublicIp = real_public_ip
SmartConnect.clientPublicIP = real_public_ip


# =====================================================================
# 3. Patch SmartConnect.placeOrder to NEVER swallow broker rejection responses
# =====================================================================
_original_smartconnect_place_order = SmartConnect.placeOrder

def _safe_smartconnect_place_order(self, orderparams):
    """
    Patched placeOrder that returns the full response dictionary from Angel One,
    preserving exact broker error codes (e.g. AG7002, AB1004, AB2001, AB1010, AB1005, AG8001)
    and detailed rejection messages rather than returning None on rejection.
    """
    params = orderparams.copy() if orderparams else {}
    for k in list(params.keys()):
        if params[k] is None:
            del params[k]

    try:
        # Ensure latest public IP header
        real_ip = get_real_public_ip()
        self.clientPublicIp = real_ip
        self.clientPublicIP = real_ip

        response = self._postRequest("api.order.place", params)

        if response is not None:
            # Check if execution succeeded
            is_success = (
                response.get("status") is True or
                response.get("success") is True
            )
            data = response.get("data")
            if is_success and isinstance(data, dict) and "orderid" in data:
                return response

            # If rejected or error, return the dictionary with status/message/errorcode
            if not is_success:
                # Ensure status and message are present for downstream consumers
                if "status" not in response:
                    response["status"] = False
                if "message" not in response and "error" in response:
                    response["message"] = response["error"]
                if "errorCode" in response and "errorcode" not in response:
                    response["errorcode"] = response["errorCode"]
            return response
        else:
            return {
                "status": False,
                "success": False,
                "message": "Null response received from Angel One API server",
                "errorcode": "NULL_RESPONSE",
                "data": None
            }
    except Exception as e:
        logger.error(f"Error in SmartConnect._postRequest during placeOrder: {e}")
        return {
            "status": False,
            "success": False,
            "message": str(e),
            "errorcode": "REQUEST_EXCEPTION",
            "data": None
        }

SmartConnect.placeOrder = _safe_smartconnect_place_order
logger.info("SmartConnect read-only FS, Public IP, and placeOrder patches applied successfully.")
