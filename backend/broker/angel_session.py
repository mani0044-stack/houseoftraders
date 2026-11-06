import pyotp
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
import backend.broker.patch_smartapi  # Apply SmartConnect read-only FS patch
from backend.broker.patch_smartapi import enforce_static_ip_egress
from backend.broker.proxy_config import account_proxy_config
from SmartApi import SmartConnect
from backend.config import settings
from backend.engine.instrument_service import instrument_service
from backend.broker.fo_order_manager import (
  get_scrip_master,
  parse_fo_symbol,
  normalize_order_type,
  build_price_fields,
  safe_tick_size,
  MARKET,
  LIMIT,
  STOPLOSS_LIMIT,
  STOPLOSS_MARKET,
)

logger = logging.getLogger(__name__)

class AccountSession:
  """
  Individual account session manager for an Angel One broker account.
  Manages TOTP generation, SmartConnect JWT authentication, feed tokens, live RMS margin,
  positions, order book sync, and live order execution directly via SmartAPI.
  """
  def __init__(
    self,
    account_id: str,
    client_id: str,
    api_key: str,
    pin: str,
    totp_secret: str,
    proxy_url: str = "",
    static_ip: str = "",
  ):
    self.account_id = account_id
    self.client_id = client_id.strip()
    self.api_key = api_key.strip()
    self.pin = pin.strip()
    self.totp_secret = totp_secret.strip()

    # Per-account static-IP egress (falls back to server-wide settings).
    self.proxy_url = (proxy_url or "").strip()
    self.static_ip = (static_ip or "").strip()

    self.status: str = "DISCONNECTED" # CONNECTED, AUTHENTICATION_REQUIRED, DISCONNECTED
    self.jwt_token: Optional[str] = None
    self.feed_token: Optional[str] = None
    self.refresh_token: Optional[str] = None
    self.last_authenticated: Optional[datetime] = None
    self.smart_api: Optional[SmartConnect] = None

  @property
  def proxy_config(self) -> Dict[str, Any]:
    """Effective proxy settings for this account (account -> server -> direct)."""
    return account_proxy_config(self.proxy_url, self.static_ip)

  @property
  def proxies(self) -> Dict[str, str]:
    return self.proxy_config["proxies"]

  @property
  def egress_ip(self) -> str:
    return str(self.proxy_config["staticIp"] or "")

  def _diagnostic_payload(self) -> Dict[str, Any]:
    """Account-specific egress facts for rejection diagnostics."""
    config = self.proxy_config
    return {
      "proxy_enabled": config["enabled"],
      "static_ip": config["staticIp"],
      "proxy_host": config["proxyHost"],
      "proxy_source": config["source"],
    }

  def set_proxy_config(self, proxy_url: str = "", static_ip: str = "") -> None:
    """Update this account's static-IP configuration and any live client."""
    self.proxy_url = (proxy_url or "").strip()
    self.static_ip = (static_ip or "").strip()
    if self.smart_api is not None:
      enforce_static_ip_egress(
        self.smart_api,
        proxies=self.proxies,
        static_ip=self.egress_ip,
        context=f"proxy update for {self.client_id}",
      )

  def generate_totp(self) -> Tuple[str, str]:
    """Generate 6-digit TOTP code for automated Angel One 2FA authentication."""
    if not self.totp_secret:
      return "", "TOTP Secret is missing. Please configure your Angel One 2FA TOTP secret."
    try:
      raw_secret = self.totp_secret.strip()
      
      # Handle if user pasted full otpauth:// URI
      if "otpauth://" in raw_secret.lower() or "secret=" in raw_secret.lower():
        import urllib.parse
        parsed = urllib.parse.urlparse(raw_secret)
        query_params = urllib.parse.parse_qs(parsed.query)
        if "secret" in query_params:
          raw_secret = query_params["secret"][0]

      clean_secret = raw_secret.replace(" ", "").replace("-", "").strip().upper()

      # Handle base32 padding if missing
      missing_padding = len(clean_secret) % 8
      if missing_padding:
        clean_secret += '=' * (8 - missing_padding)

      totp = pyotp.TOTP(clean_secret)
      return totp.now(), ""
    except Exception as e:
      err_msg = str(e)
      if "Non-base32" in err_msg or "Incorrect padding" in err_msg or "b32decode" in err_msg:
        err_msg = "Invalid TOTP Secret Key format. The TOTP Secret must be a valid Base32 string (letters A-Z, numbers 2-7) from your Angel One SmartAPI 2FA setup."
      logger.error(f"Error generating TOTP for account {self.client_id}: {err_msg}")
      return "", err_msg

  def authenticate(self) -> Tuple[bool, str]:
    """
    Authenticate account with Angel One SmartAPI using API Key, Client ID, PIN, and TOTP.
    Returns (success_boolean, message).
    """
    if not self.api_key or not self.client_id or not self.pin or not self.totp_secret:
      msg = f"Missing credentials for {self.client_id}. API Key, Client ID, PIN, and TOTP Secret are required."
      logger.warning(msg)
      self.status = "AUTHENTICATION_REQUIRED"
      return False, msg

    totp_code, totp_err = self.generate_totp()
    if not totp_code:
      msg = f"Angel One Authentication Failed: {totp_err}"
      self.status = "AUTHENTICATION_REQUIRED"
      return False, msg

    try:
      # Route authentication and all subsequent order traffic through this
      # account's static-IP proxy (falls back to server-wide settings).
      proxy_config = self.proxy_config
      self.smart_api = SmartConnect(
        api_key=self.api_key,
        proxies=proxy_config["proxies"] or None,
      )
      # SmartConnect ignores clientPublicIP in its constructor, so pin the
      # whitelisted egress IP immediately after construction.
      enforce_static_ip_egress(
        self.smart_api,
        proxies=proxy_config["proxies"],
        static_ip=proxy_config["staticIp"],
        context=f"authentication for {self.client_id}",
      )
      auth_data = self.smart_api.generateSession(self.client_id, self.pin, totp_code)

      if auth_data and auth_data.get("status"):
        data = auth_data.get("data", {})
        self.jwt_token = data.get("jwtToken")
        self.feed_token = data.get("feedToken")
        self.refresh_token = data.get("refreshToken")
        self.last_authenticated = datetime.utcnow()
        self.status = "CONNECTED"
        msg = f"Successfully authenticated Angel One session for account {self.client_id}"
        logger.info(msg)
        return True, msg
      else:
        error_msg = auth_data.get("message", "Invalid API Key, Client ID, PIN, or TOTP Secret") if auth_data else "No response from Angel One API"
        logger.warning(f"Angel One authentication failed for {self.client_id}: {error_msg}")
        self.status = "AUTHENTICATION_REQUIRED"
        return False, f"Angel One Authentication Failed: {error_msg}"
    except Exception as e:
      err_str = str(e)
      logger.error(f"Failed Angel One authentication exception for {self.client_id}: {err_str}")
      self.status = "AUTHENTICATION_REQUIRED"
      proxy_config = self.proxy_config
      if proxy_config["enabled"]:
        return False, (
          f"Angel One Connection Error via static-IP proxy "
          f"{proxy_config['proxyHost'] or 'configured'}: {err_str}"
        )
      return False, f"Angel One Connection Error: {err_str}"

  def fetch_rms_limits(self) -> Dict[str, float]:
    """Fetch live available margin and funds from Angel One SmartAPI RMS Limits."""
    if self.status != "CONNECTED" or not self.smart_api:
      ok, _ = self.authenticate()
      if not ok or not self.smart_api:
        return {"available_margin": 0.0, "used_margin": 0.0, "total_capital": 0.0}

    try:
      rms_res = self.smart_api.rmsLimit()
      if rms_res and rms_res.get("status") and rms_res.get("data"):
        data = rms_res.get("data", {})
        avail = float(data.get("availablecash", 0.0) or data.get("net", 0.0) or 0.0)
        used = float(data.get("utiliseddebits", 0.0) or 0.0)
        collateral = float(data.get("collateral", 0.0) or 0.0)
        total = avail + used + collateral
        return {
          "available_margin": round(avail, 2),
          "used_margin": round(used, 2),
          "total_capital": round(total if total > 0 else avail, 2)
        }
    except Exception as e:
      logger.error(f"Error fetching RMS limits for {self.client_id}: {e}")
    return {"available_margin": 0.0, "used_margin": 0.0, "total_capital": 0.0}

  def fetch_positions(self) -> List[Dict[str, Any]]:
    """Fetch live positions directly from Angel One broker servers."""
    if self.status != "CONNECTED" or not self.smart_api:
      self.authenticate()
    if not self.smart_api:
      return []

    try:
      pos_res = self.smart_api.position()
      if pos_res and pos_res.get("status") and pos_res.get("data"):
        return pos_res.get("data") or []
    except Exception as e:
      logger.error(f"Error fetching positions for {self.client_id}: {e}")
    return []

  def fetch_orders(self) -> List[Dict[str, Any]]:
    """Fetch live order book directly from Angel One broker servers."""
    if self.status != "CONNECTED" or not self.smart_api:
      self.authenticate()
    if not self.smart_api:
      return []

    try:
      orders_res = self.smart_api.orderBook()
      if orders_res and orders_res.get("status") and orders_res.get("data"):
        return orders_res.get("data") or []
    except Exception as e:
      logger.error(f"Error fetching order book for {self.client_id}: {e}")
    return []

  def place_order(
    self,
    symbol: str,
    side: str, # BUY or SELL
    quantity: int,
    price: float = 0.0,
    order_type: str = "MARKET",
    product_type: str = "CARRYFORWARD",
    duration: str = "DAY",
    exchange: Optional[str] = None,
    variety: str = "NORMAL",
    trigger_price: float = 0.0,
    symboltoken: Optional[str] = None,
    tradingsymbol: Optional[str] = None,
    lotsize: Optional[int] = None,
  ) -> Dict[str, Any]:
    """
    Place order directly with Angel One SmartAPI.
    Returns dictionary with success status, broker order ID, or explicit error details.

    The exact contract (token + tradingsymbol + lot size + tick size) is resolved
    from the Angel One Scrip Master. A fallback/dummy token is NEVER sent to the
    broker, because that is what causes orders to land on the wrong strike.
    """
    if self.status != "CONNECTED":
      ok, auth_err = self.authenticate()
      if not ok:
        raise ValueError(f"Angel One session not connected for account {self.client_id}: {auth_err}")

    if not self.smart_api:
      raise ValueError(f"SmartAPI client not initialized for account {self.client_id}")

    # Orders MUST leave from the whitelisted static IP. Re-apply the proxy right
    # before submission so a reused/stale session can never place an order from
    # the host's public IP.
    enforce_static_ip_egress(
      self.smart_api,
      proxies=self.proxies,
      static_ip=self.egress_ip,
      context=f"order placement for {self.client_id}",
    )

    master = get_scrip_master()

    # 1. Prefer an exact trading-symbol lookup (covers options, futures and equities)
    info = master.lookup_by_symbol(tradingsymbol or symbol)
    if not info and symboltoken:
      info = master.lookup_by_token(symboltoken)

    # 2. Parse an option/future trading symbol and resolve underlying/expiry/strike/type
    if not info:
      parsed = parse_fo_symbol(tradingsymbol or symbol)
      if parsed:
        try:
          info = master.lookup_fo_instrument(
            symbol=parsed["underlying"],
            expiry=parsed["expiry"],
            strike=parsed["strike"],
            option_type=parsed["option_type"],
            exchange=exchange or ("BFO" if parsed["underlying"] in ("SENSEX", "BANKEX") else "NFO"),
            tradingsymbol=tradingsymbol,
            symboltoken=symboltoken,
          )
        except Exception as resolve_err:
          logger.error(f"Failed resolving F&O contract for {symbol}: {resolve_err}")
          info = None

    if not info:
      # Non-derivative (cash) fallback - only accepted when the symbol matches exactly.
      inst = instrument_service.get_instrument(symbol)
      if inst and str(inst.get("symbol", "")).strip().upper() == str(symbol).strip().upper():
        info = {
          "symboltoken": str(inst.get("token")),
          "tradingsymbol": str(inst.get("symbol")),
          "lotsize": int(inst.get("lotsize", lotsize or quantity or 1) or 1),
          "exchange": str(inst.get("exchange", exchange or "NSE")).upper(),
          "tick_size": float(inst.get("tick_size", 0.05) or 0.05),
        }

    if not info:
      raise ValueError(
        f"Unable to resolve exact instrument for '{symbol}' in the Angel One Scrip Master. "
        f"Refusing to place the order with a fallback token."
      )

    trading_symbol = info["tradingsymbol"]
    symbol_token = info["symboltoken"]
    exchange_name = (exchange or info.get("exchange") or "NFO").upper()
    tick_size = safe_tick_size(info.get("tick_size", 0.05))
    resolved_lot_size = int(info.get("lotsize", lotsize or 1) or 1)

    # Quantity must be a valid multiple of the contract lot size
    try:
      quantity = int(quantity)
    except (TypeError, ValueError):
      raise ValueError(f"Invalid quantity: '{quantity}'")
    if quantity <= 0:
      raise ValueError("Quantity must be greater than zero.")
    if resolved_lot_size > 0 and quantity % resolved_lot_size != 0:
      raise ValueError(
        f"Quantity {quantity} is not a multiple of the {trading_symbol} lot size ({resolved_lot_size})."
      )

    # 3. Normalize order type and build broker-compatible price fields
    order_type = normalize_order_type(order_type)
    if order_type not in (MARKET, LIMIT, STOPLOSS_LIMIT, STOPLOSS_MARKET):
      raise ValueError(f"Unsupported order type: '{order_type}'")

    price_str, trigger_str, price_err = build_price_fields(
      order_type=order_type,
      price=price,
      trigger_price=trigger_price,
      tick_size=tick_size,
    )
    if price_err:
      raise ValueError(price_err)

    order_params = {
      "variety": variety.upper(),
      "tradingsymbol": trading_symbol,
      "symboltoken": str(symbol_token),
      "transactiontype": side.upper(),
      "exchange": exchange_name,
      "ordertype": order_type,
      "producttype": product_type.upper(),
      "duration": duration.upper(),
      "price": price_str,
      "squareoff": "0",
      "stoploss": "0",
      "quantity": str(quantity)
    }

    if order_type in (STOPLOSS_LIMIT, STOPLOSS_MARKET):
      order_params["triggerprice"] = trigger_str

    logger.info(f"Transmitting order to Angel One SmartAPI ({self.client_id}): {order_params}")

    try:
      resp = self.smart_api.placeOrder(order_params)
      logger.info(f"Angel One SmartAPI placeOrder response for {self.client_id}: {resp}")

      if resp and isinstance(resp, str):
        return {"success": True, "broker_order_id": resp, "mode": "LIVE", "symbol": trading_symbol, "exchange": exchange_name}
      elif isinstance(resp, dict):
        if resp.get("status") or resp.get("success"):
          order_id = resp.get("data", {}).get("orderid") or resp.get("orderid") or f"ANGEL-{datetime.utcnow().strftime('%H%M%S')}"
          return {"success": True, "broker_order_id": order_id, "mode": "LIVE", "symbol": trading_symbol, "exchange": exchange_name}
        else:
          # Check if session/token expired and auto-retry once
          from backend.broker.rejection_analyzer import diagnose_rejection
          diag = diagnose_rejection(resp, self._diagnostic_payload())
          if diag.get("suggested_action") == "REAUTHENTICATE_SESSION":
            logger.info(f"Session token expired for {self.client_id}. Auto-reauthenticating via TOTP and retrying order...")
            auth_ok, auth_msg = self.authenticate()
            if auth_ok and self.smart_api:
              retry_resp = self.smart_api.placeOrder(order_params)
              if retry_resp and isinstance(retry_resp, str):
                return {"success": True, "broker_order_id": retry_resp, "mode": "LIVE", "symbol": trading_symbol, "exchange": exchange_name}
              elif isinstance(retry_resp, dict) and (retry_resp.get("status") or retry_resp.get("success")):
                order_id = retry_resp.get("data", {}).get("orderid") or retry_resp.get("orderid") or f"ANGEL-{datetime.utcnow().strftime('%H%M%S')}"
                return {"success": True, "broker_order_id": order_id, "mode": "LIVE", "symbol": trading_symbol, "exchange": exchange_name}
              diag = diagnose_rejection(retry_resp, self._diagnostic_payload())

          err_msg = diag["raw_message"]
          logger.error(f"Order placement rejected by Angel One for {self.client_id} [{diag['factor']}]: {err_msg}")
          return {
            "success": False,
            "error": err_msg,
            "diagnostic": diag,
            "mode": "LIVE"
          }
      else:
        from backend.broker.rejection_analyzer import diagnose_rejection
        diag = diagnose_rejection(resp, self._diagnostic_payload())
        return {
          "success": False,
          "error": diag["raw_message"],
          "diagnostic": diag,
          "mode": "LIVE"
        }
    except Exception as e:
      err_str = str(e)
      logger.error(f"SmartAPI placeOrder exception for account {self.client_id}: {err_str}")
      from backend.broker.rejection_analyzer import diagnose_rejection
      diag = diagnose_rejection(err_str, self._diagnostic_payload())
      return {
        "success": False,
        "error": err_str,
        "diagnostic": diag,
        "mode": "LIVE"
      }

  def cancel_order(self, order_id: str, variety: str = "NORMAL") -> Dict[str, Any]:
    """Cancel order on Angel One broker servers."""
    if self.status != "CONNECTED" or not self.smart_api:
      self.authenticate()
    if not self.smart_api:
      return {"success": False, "error": "SmartAPI session not connected"}

    enforce_static_ip_egress(
      self.smart_api,
      proxies=self.proxies,
      static_ip=self.egress_ip,
      context=f"order cancellation for {self.client_id}",
    )

    try:
      res = self.smart_api.cancelOrder(order_id, variety)
      logger.info(f"Angel One SmartAPI cancelOrder response: {res}")
      return {"success": True, "data": res}
    except Exception as e:
      logger.error(f"Error cancelling order {order_id} on Angel One: {e}")
      return {"success": False, "error": str(e)}

class SessionManager:
  """
  Central manager tracking broker session instances for multiple Angel One accounts.
  """
  def __init__(self):
    self.sessions: Dict[str, AccountSession] = {}

  @staticmethod
  def _load_account_proxy(account_id: str) -> Tuple[str, str]:
    """
    Read an account's stored proxy URL / static IP from the database.

    Used when a session is created by a code path that does not have the full
    account record (order routing, background strategy runner, ...). Failures
    fall back to server-wide settings instead of blocking the session.
    """
    try:
      from backend.database.session import SessionLocal
      from backend.database.models import TradingAccountModel
      from backend.security.encryption import vault

      db = SessionLocal()
      try:
        acc = (
          db.query(TradingAccountModel)
          .filter(TradingAccountModel.id == account_id)
          .first()
        )
        if not acc:
          return "", ""
        proxy_url = (
          vault.decrypt(acc.encrypted_proxy_url)
          if getattr(acc, "encrypted_proxy_url", None)
          else ""
        )
        return proxy_url or "", getattr(acc, "static_ip", "") or ""
      finally:
        db.close()
    except Exception as exc:
      logger.warning(
        "Could not load proxy configuration for account %s: %s: %s",
        account_id,
        type(exc).__name__,
        exc,
      )
      return "", ""

  def get_or_create_session(
    self,
    account_id: str,
    client_id: str = "",
    api_key: str = "",
    pin: str = "",
    totp_secret: str = "",
    proxy_url: Optional[str] = None,
    static_ip: Optional[str] = None,
  ) -> AccountSession:
    if account_id not in self.sessions:
      # Explicit values win; otherwise load this account's own proxy from the
      # database so every entry point honours per-account static IPs.
      if proxy_url is None or static_ip is None:
        stored_proxy, stored_ip = self._load_account_proxy(account_id)
        if proxy_url is None:
          proxy_url = stored_proxy
        if static_ip is None:
          static_ip = stored_ip

      self.sessions[account_id] = AccountSession(
        account_id,
        client_id,
        api_key,
        pin,
        totp_secret,
        proxy_url=proxy_url or "",
        static_ip=static_ip or "",
      )
      return self.sessions[account_id]

    session = self.sessions[account_id]
    # Update credentials if changed
    if client_id:
      session.client_id = client_id.strip()
    if api_key:
      session.api_key = api_key.strip()
    if pin:
      session.pin = pin.strip()
    if totp_secret:
      session.totp_secret = totp_secret.strip()

    # Refresh the egress configuration when the caller supplies new values.
    if proxy_url is not None or static_ip is not None:
      next_proxy = session.proxy_url if proxy_url is None else proxy_url
      next_ip = session.static_ip if static_ip is None else static_ip
      if (
        (next_proxy or "").strip() != session.proxy_url
        or (next_ip or "").strip() != session.static_ip
      ):
        session.set_proxy_config(next_proxy, next_ip)

    return session

  def get_session(self, account_id: str) -> Optional[AccountSession]:
    return self.sessions.get(account_id)

  def get_all_active_sessions(self) -> List[AccountSession]:
    return [s for s in self.sessions.values() if s.status == "CONNECTED"]

session_manager = SessionManager()


