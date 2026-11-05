import re
import socket
import logging
from typing import Dict, Any, Optional, List, Tuple
from enum import Enum

logger = logging.getLogger(__name__)

# =====================================================================
# Exchange Freeze Limits Table (NSE & BSE Derivative Contracts)
# =====================================================================
EXCHANGE_FREEZE_LIMITS = {
    "NIFTY": {
        "freeze_qty": 1800,
        "default_lot": 65,
        "max_lots_per_order": 27,
        "exchange": "NFO"
    },
    "BANKNIFTY": {
        "freeze_qty": 900,
        "default_lot": 30,
        "max_lots_per_order": 30,
        "exchange": "NFO"
    },
    "FINNIFTY": {
        "freeze_qty": 1800,
        "default_lot": 60,
        "max_lots_per_order": 30,
        "exchange": "NFO"
    },
    "MIDCPNIFTY": {
        "freeze_qty": 4200,
        "default_lot": 120,
        "max_lots_per_order": 35,
        "exchange": "NFO"
    },
    "SENSEX": {
        "freeze_qty": 1000,
        "default_lot": 20,
        "max_lots_per_order": 50,
        "exchange": "BFO"
    },
    "BANKEX": {
        "freeze_qty": 900,
        "default_lot": 30,
        "max_lots_per_order": 30,
        "exchange": "BFO"
    }
}


def _resolve_lot_size(payload: Dict[str, Any], fallback: int) -> int:
    """
    Resolve the real contract lot size from the Scrip Master.

    The static EXCHANGE_FREEZE_LIMITS table is only a fallback: exchange lot sizes
    change over time, and using a stale value makes pre-trade quantity checks wrong.
    """
    try:
        from backend.broker.fo_order_manager import get_scrip_master
        scrip_master = get_scrip_master()
    except Exception:
        return int(payload.get("lotsize") or fallback)

    def fo_lot(info: Optional[Dict[str, Any]]) -> Optional[int]:
        if not info or not info.get("lotsize"):
            return None
        # Only derivative rows carry the contract lot size; an index/equity row
        # (e.g. "NIFTY") has lotsize 1 and must not override the F&O default.
        if str(info.get("exchange", "")).upper() not in ("NFO", "BFO"):
            return None
        return int(info["lotsize"])

    for key in ("symboltoken", "symbol_token", "token"):
        token = payload.get(key)
        if token:
            lot = fo_lot(scrip_master.lookup_by_token(str(token)))
            if lot:
                return lot

    for key in ("tradingsymbol", "trading_symbol", "symbol"):
        tsym = payload.get(key)
        if tsym:
            lot = fo_lot(scrip_master.lookup_by_symbol(str(tsym)))
            if lot:
                return lot

    return int(payload.get("lotsize") or fallback)


class RejectionFactor(str, Enum):
    MARGIN_COLLATERAL_SHORTFALL = "MARGIN_COLLATERAL_SHORTFALL"
    RMS_RISK_RULES = "RMS_RISK_RULES"
    PRICE_BAND_LPP = "PRICE_BAND_LPP"
    SEGMENT_SCRIP_RESTRICTION = "SEGMENT_SCRIP_RESTRICTION"
    FREEZE_QUANTITY_LIMIT = "FREEZE_QUANTITY_LIMIT"
    SESSION_TOKEN_IP_EXPIRY = "SESSION_TOKEN_IP_EXPIRY"
    UNKNOWN_REJECTION = "UNKNOWN_REJECTION"


FACTOR_METADATA = {
    RejectionFactor.MARGIN_COLLATERAL_SHORTFALL: {
        "title": "Margin & Collateral Shortfall",
        "badge": "MARGIN SHORTFALL",
        "color": "amber",
        "summary": "Available cash or unpledged margin fell short, or peak margin rules restricted the trade.",
        "icon": "Wallet"
    },
    RejectionFactor.RMS_RISK_RULES: {
        "title": "RMS Risk Rules & OI Caps",
        "badge": "RMS RISK RULE",
        "color": "rose",
        "summary": "Broker internal safety limits blocked the trade due to high volatility, open interest (OI) caps, or single-order value caps.",
        "icon": "ShieldAlert"
    },
    RejectionFactor.PRICE_BAND_LPP: {
        "title": "Price Band & LPP Violations",
        "badge": "PRICE / LPP LIMIT",
        "color": "orange",
        "summary": "Limit or stop-loss price sits outside daily circuit limits or Last Price Point (LPP) execution range.",
        "icon": "TrendingDown"
    },
    RejectionFactor.SEGMENT_SCRIP_RESTRICTION: {
        "title": "Segment or Scrip Restrictions",
        "badge": "SEGMENT RESTRICTED",
        "color": "purple",
        "summary": "The contract is under surveillance (GSM/ASM), banned for new positions, or your F&O segment is inactive.",
        "icon": "Lock"
    },
    RejectionFactor.FREEZE_QUANTITY_LIMIT: {
        "title": "Freeze Quantity Limits",
        "badge": "FREEZE LIMIT EXCEEDED",
        "color": "blue",
        "summary": "The order quantity exceeded the exchange freeze limit per single order.",
        "icon": "Layers"
    },
    RejectionFactor.SESSION_TOKEN_IP_EXPIRY: {
        "title": "Session, Token & IP Authorization",
        "badge": "SESSION / IP RESTRICTION",
        "color": "red",
        "summary": "Your broker session or trading API token expired silently, or incoming IP is not registered in SmartAPI Developer Portal.",
        "icon": "KeyRound"
    },
    RejectionFactor.UNKNOWN_REJECTION: {
        "title": "Broker Execution Rejection",
        "badge": "ORDER REJECTED",
        "color": "slate",
        "summary": "The broker rejected order transmission.",
        "icon": "AlertCircle"
    }
}


def get_current_public_ip(cached: Optional[str] = None) -> str:
    """Attempts to retrieve the host public IPv4 address for SmartAPI diagnostics."""
    if cached:
        return cached
    try:
        import urllib.request
        with urllib.request.urlopen("https://api.ipify.org", timeout=2.0) as resp:
            return resp.read().decode("utf-8").strip()
    except Exception:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "49.43.88.126"


def diagnose_rejection(
    raw_response: Any,
    ui_payload: Optional[Dict[str, Any]] = None,
    account_rms: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Analyzes broker rejection responses and categorizes against all 6 critical factors:
      1. Margin & Collateral Shortfall
      2. RMS Risk Rules
      3. Price Band & LPP Violations
      4. Segment or Script Restrictions
      5. Freeze Quantity Limits
      6. Session or Token Expiry (including IP whitelist issues)
    """
    ui_payload = ui_payload or {}
    account_rms = account_rms or {}

    # 1. Normalize error string and error code
    error_code = "UNKNOWN"
    raw_msg = ""

    if isinstance(raw_response, dict):
        raw_msg = str(
            raw_response.get("message") or
            raw_response.get("error") or
            raw_response.get("data") or
            raw_response.get("text") or ""
        ).strip()
        error_code = str(
            raw_response.get("errorCode") or
            raw_response.get("errorcode") or
            raw_response.get("code") or "UNKNOWN"
        ).strip().upper()
    elif isinstance(raw_response, str):
        raw_msg = raw_response.strip()
    elif raw_response is None:
        raw_msg = "Broker returned null response or connection dropped."

    # If message is literally "None", replace with descriptive diagnostic
    if not raw_msg or raw_msg.lower() == "none":
        raw_msg = "Broker rejected order execution without specific message payload."

    raw_lower = raw_msg.lower()
    code_upper = error_code.upper()

    factor = RejectionFactor.UNKNOWN_REJECTION
    explanation = ""
    actionable_solution = ""
    suggested_action = "RETRY"
    additional_data = {}

    # =====================================================================
    # FACTOR 6: Session, Token & IP Authorization (AG7002, AG8001, AG8002, etc.)
    # =====================================================================
    if (
        "ag7002" in code_upper or
        "not a registered ip" in raw_lower or
        "registered ip" in raw_lower or
        "check your registered ip" in raw_lower or
        "ip address" in raw_lower
    ):
        factor = RejectionFactor.SESSION_TOKEN_IP_EXPIRY
        ip_match = re.search(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", raw_msg)
        detected_ip = ip_match.group(1) if ip_match else get_current_public_ip()
        additional_data["detected_ip"] = detected_ip
        additional_data["portal_url"] = "https://smartapi.angelbroking.com"

        explanation = (
            f"Angel One SmartAPI blocked this trade because your current public IP ({detected_ip}) "
            "is not whitelisted in your Angel One Developer Portal app settings (Error Code: AG7002)."
        )
        actionable_solution = (
            f"1. Open https://smartapi.angelbroking.com and log in.\n"
            f"2. Go to 'Apps' -> Click 'Edit' on your Trading App API Key.\n"
            f"3. In the 'Allowed IP Address / Client Local IP' field, add your IP: {detected_ip} (or set to dynamic/leave blank if your provider allows).\n"
            f"4. Click 'Save Changes' and re-authenticate your account."
        )
        suggested_action = "UPDATE_IP_WHITELIST"

    elif (
        "ag8001" in code_upper or
        "ag8002" in code_upper or
        "ag8003" in code_upper or
        "token expired" in raw_lower or
        "invalid token" in raw_lower or
        "session expired" in raw_lower or
        "jwt token" in raw_lower or
        "unauthorized" in raw_lower or
        "session invalid" in raw_lower or
        "authentication failed" in raw_lower
    ):
        factor = RejectionFactor.SESSION_TOKEN_IP_EXPIRY
        explanation = (
            f"Your Angel One SmartAPI JWT session token has expired or is invalid ({error_code}). "
            "SmartAPI access tokens expire daily at midnight or after 24 hours of inactivity."
        )
        actionable_solution = (
            "1. Click 'Re-authenticate Session' below to automatically regenerate the JWT token via TOTP.\n"
            "2. Ensure your TOTP Secret in Accounts Settings is valid and synced with Google Authenticator."
        )
        suggested_action = "REAUTHENTICATE_SESSION"

    # =====================================================================
    # FACTOR 5: Freeze Quantity Limits (AB1005, Exchange Max Quantity)
    # =====================================================================
    elif (
        "ab1005" in code_upper or
        "freeze" in raw_lower or
        "freeze limit" in raw_lower or
        "exceeded max quantity" in raw_lower or
        "max allowed quantity" in raw_lower or
        "quantity exceeds" in raw_lower
    ):
        factor = RejectionFactor.FREEZE_QUANTITY_LIMIT
        symbol = str(ui_payload.get("symbol", "NIFTY")).upper()
        sym_key = next((k for k in EXCHANGE_FREEZE_LIMITS if k in symbol), "NIFTY")
        limit_info = EXCHANGE_FREEZE_LIMITS.get(sym_key, {"freeze_qty": 1800, "default_lot": 25})

        lot_size = _resolve_lot_size(ui_payload, limit_info["default_lot"])
        qty = int(ui_payload.get("quantity") or (int(ui_payload.get("lots", 1)) * lot_size))
        slices = (qty + limit_info["freeze_qty"] - 1) // limit_info["freeze_qty"]

        explanation = (
            f"Exchange Single-Order Freeze Limit Exceeded: The requested quantity ({qty} shares) "
            f"exceeds the NSE/BSE single-order limit of {limit_info['freeze_qty']} shares for {sym_key}."
        )
        actionable_solution = (
            f"1. Reduce your order size to maximum {limit_info['freeze_qty']} shares ({limit_info['max_lots_per_order']} lots).\n"
            f"2. Or use Auto-Slicing to split this into {slices} separate sub-orders complying with exchange limits."
        )
        suggested_action = "SLICE_ORDER"
        additional_data["freeze_limit"] = limit_info["freeze_qty"]
        additional_data["required_slices"] = slices

    # =====================================================================
    # FACTOR 1: Margin & Collateral Shortfall (AB1004, AB1007, Insufficient Funds)
    # =====================================================================
    elif (
        "ab1004" in code_upper or
        "ab1007" in code_upper or
        "insufficient funds" in raw_lower or
        "margin shortfall" in raw_lower or
        "insufficient margin" in raw_lower or
        "margin required" in raw_lower or
        "peak margin" in raw_lower or
        "funds unavailable" in raw_lower or
        "collateral" in raw_lower
    ):
        factor = RejectionFactor.MARGIN_COLLATERAL_SHORTFALL
        avail_margin = account_rms.get("available_margin", 0.0)
        explanation = (
            "Available trading margin or unpledged collateral is insufficient to execute this F&O contract. "
            "SEBI peak margin and SPAN + Exposure rules require upfront margin coverage before order routing."
        )
        actionable_solution = (
            f"1. Current Available Cash/Margin: ₹{avail_margin:,.2f}.\n"
            "2. Transfer funds to your Angel One account via UPI/NetBanking or unpledge approved liquid shares.\n"
            "3. If buying options, reduce the number of lots to match your available cash balance."
        )
        suggested_action = "ADD_MARGIN"
        additional_data["available_margin"] = avail_margin

    # =====================================================================
    # FACTOR 3: Price Band & LPP Violations (AB1010, AB1011, Circuit limits)
    # =====================================================================
    elif (
        "ab1010" in code_upper or
        "ab1011" in code_upper or
        "circuit" in raw_lower or
        "lpp" in raw_lower or
        "price band" in raw_lower or
        "outside range" in raw_lower or
        "limit price outside" in raw_lower or
        "dummy price" in raw_lower or
        "last price point" in raw_lower or
        ("market" in raw_lower and "not allowed" in raw_lower)
    ):
        factor = RejectionFactor.PRICE_BAND_LPP
        explanation = (
            "Your order price violates the exchange Last Price Point (LPP) execution range or daily circuit band. "
            "Exchanges restrict option orders that diverge by more than ±10% to ±20% from reference price, and brokers block MARKET orders on illiquid strikes."
        )
        actionable_solution = (
            "1. Switch order type from MARKET to LIMIT.\n"
            "2. Enter a limit price close to the current Last Traded Price (LTP) or within the active Bid/Ask spread.\n"
            "3. Verify that your stop-loss trigger price is within the exchange defined LPP limits."
        )
        suggested_action = "SWITCH_TO_LIMIT"

    # =====================================================================
    # FACTOR 4: Segment or Script Restrictions (AB1001, AB1008, AB1014, GSM/ASM)
    # =====================================================================
    elif (
        "ab1001" in code_upper or
        "ab1008" in code_upper or
        "ab1014" in code_upper or
        "segment" in raw_lower or
        "asm" in raw_lower or
        "gsm" in raw_lower or
        "surveillance" in raw_lower or
        "banned" in raw_lower or
        "blocked for new positions" in raw_lower or
        "exchange closed" in raw_lower or
        "closed" in raw_lower
    ):
        factor = RejectionFactor.SEGMENT_SCRIP_RESTRICTION
        if "closed" in raw_lower:
            explanation = (
                "The exchange market is currently closed. Normal F&O orders are only accepted during live market hours (09:15 to 15:30 IST)."
            )
            actionable_solution = "Place this trade during market hours, or select After Market Order (AMO) if supported."
        else:
            explanation = (
                "The contract is restricted under exchange surveillance (GSM/ASM), placed in F&O ban period (MWPL > 95%), "
                "or the F&O derivative segment (NFO/BFO) is unactivated on your broker account."
            )
            actionable_solution = (
                "1. Check if F&O segment is activated in Angel One (Account -> Profile -> Segments).\n"
                "2. Ensure the underlying stock is not currently on the NSE F&O ban list.\n"
                "3. Try selecting a different liquid strike or index contract."
            )
        suggested_action = "ACTIVATE_SEGMENT"

    # =====================================================================
    # FACTOR 2: RMS Risk Rules & OI Limits (AB2001, AB2006, RMS Blocked)
    # =====================================================================
    elif (
        "ab2001" in code_upper or
        "ab2006" in code_upper or
        "rms" in raw_lower or
        "oi limit" in raw_lower or
        "open interest" in raw_lower or
        "square off only" in raw_lower or
        "squareoff only" in raw_lower or
        "risk" in raw_lower or
        "turnover limit" in raw_lower
    ):
        factor = RejectionFactor.RMS_RISK_RULES
        explanation = (
            "Angel One's internal Risk Management System (RMS) rejected this order. "
            "This commonly happens when Open Interest (OI) on far OTM strikes approaches broker capacity caps, or when high volatility triggers safety square-off-only mode."
        )
        actionable_solution = (
            "1. Switch to an At-The-Money (ATM) or In-The-Money (ITM) strike with higher liquidity and active OI.\n"
            "2. Avoid deep Out-Of-The-Money (OTM) strikes where brokers enforce OI purchase restrictions.\n"
            "3. If trading intraday, ensure your single-order value does not exceed broker RMS caps."
        )
        suggested_action = "CHANGE_STRIKE"

    else:
        # Fallback unknown rejection
        factor = RejectionFactor.UNKNOWN_REJECTION
        explanation = f"Broker rejected order: {raw_msg}"
        actionable_solution = (
            "1. Check your Angel One Order Book for specific status text.\n"
            "2. Verify broker credentials, account margin, and trading segment activation.\n"
            "3. Re-authenticate session and retry."
        )

    meta = FACTOR_METADATA.get(factor, FACTOR_METADATA[RejectionFactor.UNKNOWN_REJECTION])

    # Evaluate comprehensive scorecard across all 6 factors for the UI diagnostic audit
    all_factors_evaluated = [
        {
            "id": "FACTOR_1_MARGIN",
            "name": "Margin & Collateral",
            "status": "FAILED" if factor == RejectionFactor.MARGIN_COLLATERAL_SHORTFALL else "PASSED",
            "note": "Required funds & SPAN margin coverage."
        },
        {
            "id": "FACTOR_2_RMS",
            "name": "RMS Risk Rules",
            "status": "FAILED" if factor == RejectionFactor.RMS_RISK_RULES else "PASSED",
            "note": "Broker OI caps & volatility bounds."
        },
        {
            "id": "FACTOR_3_PRICE_BAND",
            "name": "Price Band & LPP",
            "status": "FAILED" if factor == RejectionFactor.PRICE_BAND_LPP else "PASSED",
            "note": "Exchange circuit limit & LPP execution range."
        },
        {
            "id": "FACTOR_4_SEGMENT",
            "name": "Segment & Scrip",
            "status": "FAILED" if factor == RejectionFactor.SEGMENT_SCRIP_RESTRICTION else "PASSED",
            "note": "NFO/BFO segment activation & GSM/ASM list."
        },
        {
            "id": "FACTOR_5_FREEZE",
            "name": "Freeze Quantity Limits",
            "status": "FAILED" if factor == RejectionFactor.FREEZE_QUANTITY_LIMIT else "PASSED",
            "note": "Exchange single order max share cap."
        },
        {
            "id": "FACTOR_6_SESSION_IP",
            "name": "Session, Token & IP",
            "status": "FAILED" if factor == RejectionFactor.SESSION_TOKEN_IP_EXPIRY else "PASSED",
            "note": "SmartAPI JWT token & Developer Portal IP whitelist."
        }
    ]

    return {
        "status": "FAILED",
        "factor": factor.value,
        "factor_title": meta["title"],
        "factor_badge": meta["badge"],
        "factor_color": meta["color"],
        "factor_summary": meta["summary"],
        "raw_message": raw_msg,
        "error_code": error_code,
        "explanation": explanation,
        "actionable_solution": actionable_solution,
        "suggested_action": suggested_action,
        "additional_data": additional_data,
        "all_factors_evaluated": all_factors_evaluated
    }


def pre_validate_order(
    payload: Dict[str, Any],
    account_rms: Optional[Dict[str, Any]] = None
) -> Tuple[bool, List[str], List[Dict[str, Any]]]:
    """
    Performs pre-trade risk validations prior to submitting an order to Angel One SmartAPI.
    Returns: (is_valid, warnings, errors)
    """
    warnings = []
    errors = []
    account_rms = account_rms or {}

    symbol = str(payload.get("symbol", "NIFTY")).upper()
    sym_key = next((k for k in EXCHANGE_FREEZE_LIMITS if k in symbol), "NIFTY")
    limit_info = EXCHANGE_FREEZE_LIMITS.get(sym_key, {"freeze_qty": 1800, "default_lot": 25})

    lot_size = _resolve_lot_size(payload, limit_info["default_lot"])
    lots = int(payload.get("lots") or payload.get("quantity_lots") or 1)
    total_qty = payload.get("quantity")
    if not total_qty:
        total_qty = lots * lot_size
    total_qty = int(total_qty)

    # 1. Freeze Limit Pre-Check
    if total_qty > limit_info["freeze_qty"]:
        slices = (total_qty + limit_info["freeze_qty"] - 1) // limit_info["freeze_qty"]
        errors.append({
            "factor": RejectionFactor.FREEZE_QUANTITY_LIMIT.value,
            "message": (
                f"Requested quantity of {total_qty} shares exceeds exchange freeze limit of "
                f"{limit_info['freeze_qty']} shares for {sym_key}. Must be sliced into {slices} sub-orders."
            )
        })

    # 2. Price Band & LPP Pre-Check
    order_type = str(payload.get("order_type", "MARKET")).strip().upper().replace(" ", "_")
    order_type = {
        "SL": "STOPLOSS_LIMIT",
        "SL-L": "STOPLOSS_LIMIT",
        "SL_LIMIT": "STOPLOSS_LIMIT",
        "SL-M": "STOPLOSS_MARKET",
        "SLM": "STOPLOSS_MARKET",
        "SL_M": "STOPLOSS_MARKET",
        "MKT": "MARKET",
    }.get(order_type, order_type)

    option_type = str(payload.get("option_type", "")).upper()
    if order_type == "MARKET" and option_type in ["CE", "PE"]:
        warnings.append(
            "Placing MARKET orders on options can trigger LPP rejection if market depth is wide. LIMIT order recommended."
        )

    price = float(payload.get("price", 0.0) or 0.0)
    if order_type in ["LIMIT", "STOPLOSS_LIMIT"] and price <= 0:
        errors.append({
            "factor": RejectionFactor.PRICE_BAND_LPP.value,
            "message": f"Limit price must be greater than zero for {order_type} orders."
        })

    if order_type in ["STOPLOSS_LIMIT", "STOPLOSS_MARKET"]:
        trigger = float(payload.get("trigger_price") or payload.get("triggerprice") or 0.0)
        if trigger <= 0:
            errors.append({
                "factor": RejectionFactor.PRICE_BAND_LPP.value,
                "message": f"Trigger price must be greater than zero for {order_type} orders."
            })

    # 3. Margin Pre-Check
    avail_margin = float(account_rms.get("available_margin", 0.0) or 0.0)
    if avail_margin > 0 and price > 0 and str(payload.get("transaction_type", "BUY")).upper() == "BUY":
        est_required = total_qty * price
        if est_required > avail_margin:
            shortfall = est_required - avail_margin
            errors.append({
                "factor": RejectionFactor.MARGIN_COLLATERAL_SHORTFALL.value,
                "message": (
                    f"Estimated margin shortfall: Required ₹{est_required:,.2f} vs Available ₹{avail_margin:,.2f} "
                    f"(Shortfall: ₹{shortfall:,.2f})."
                )
            })

    is_valid = len(errors) == 0
    return is_valid, warnings, errors


def calculate_order_slices(
    symbol: str,
    total_quantity: int,
    lot_size: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Calculates order batches to stay under exchange freeze limits."""
    sym_key = next((k for k in EXCHANGE_FREEZE_LIMITS if k in symbol.upper()), "NIFTY")
    limit = EXCHANGE_FREEZE_LIMITS.get(sym_key, {"freeze_qty": 1800, "default_lot": 25})
    freeze_qty = limit["freeze_qty"]
    lot_size = int(lot_size or limit["default_lot"])
    if lot_size <= 0:
        lot_size = 1

    slices = []
    remaining = total_quantity
    slice_idx = 1

    while remaining > 0:
        batch_qty = min(remaining, freeze_qty)
        # Ensure batch is a multiple of lot size
        batch_qty = (batch_qty // lot_size) * lot_size
        if batch_qty <= 0:
            batch_qty = remaining
        slices.append({
            "slice_number": slice_idx,
            "quantity": batch_qty,
            "lots": batch_qty // lot_size
        })
        remaining -= batch_qty
        slice_idx += 1

    return slices
