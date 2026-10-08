"""
Angel One SmartAPI F&O Order Execution & Scrip Master Manager Module
-------------------------------------------------------------------
Author: Quant Developer
Description: Production-ready backend script for validating, parsing, lookup,
             and executing Futures & Options (F&O) orders using Angel One SmartAPI.
"""

import os
import json
import logging
import datetime
import requests
import pyotp
from typing import Dict, Any, Optional, Tuple, Union

logger = logging.getLogger(__name__)

# Official Angel One OpenAPI Scrip Master Endpoint
ANGEL_SCRIP_MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"

class AngelScripMaster:
    """
    Manages daily downloading, disk caching, and fast in-memory indexing
    of Angel One's live Scrip Master JSON data.
    """

    def __init__(self, cache_file_path: Optional[str] = None):
        if cache_file_path:
            self.cache_file_path = cache_file_path
        else:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.cache_file_path = os.path.join(base_dir, "data", "scrip_master.json")

        self._raw_data = []
        self._indexed_fo: Dict[Tuple[str, str, str], list] = {}
        self._token_map: Dict[str, Dict[str, Any]] = {}
        self._trading_symbol_map: Dict[str, Dict[str, Any]] = {}

        self.load_scrip_master()

    def load_scrip_master(self, force_download: bool = False):
        """
        Loads Scrip Master from local cache. Downloads a fresh copy if:
        1. Cache file does not exist.
        2. Cache file is older than 24 hours.
        3. force_download is set to True.
        """
        download_needed = force_download

        if not os.path.exists(self.cache_file_path):
            download_needed = True
        else:
            try:
                file_mod_time = datetime.datetime.fromtimestamp(os.path.getmtime(self.cache_file_path))
                if datetime.datetime.now() - file_mod_time > datetime.timedelta(hours=24):
                    logger.info("Scrip master local cache is older than 24 hours. Refreshing...")
                    download_needed = True
                elif os.path.getsize(self.cache_file_path) < 1000:
                    logger.warning("Scrip master local cache file is invalid/empty. Refreshing...")
                    download_needed = True
            except Exception as e:
                logger.warning(f"Error checking cache timestamp: {e}. Defaulting to re-download.")
                download_needed = True

        if download_needed:
            self._download_scrip_master()
        else:
            logger.info(f"Loading Angel One Scrip Master from local disk cache: {self.cache_file_path}")
            try:
                with open(self.cache_file_path, "r", encoding="utf-8") as f:
                    self._raw_data = json.load(f)
            except Exception as e:
                logger.error(f"Failed to read local scrip master cache: {e}. Attempting re-download.")
                self._download_scrip_master()

        self._build_indexes()

    def _download_scrip_master(self):
        """Downloads the scrip master JSON from Angel One servers and updates local cache."""
        logger.info(f"Downloading Angel One Scrip Master from: {ANGEL_SCRIP_MASTER_URL}...")
        try:
            resp = requests.get(ANGEL_SCRIP_MASTER_URL, timeout=45)
            resp.raise_for_status()
            self._raw_data = resp.json()

            # Ensure parent directories exist
            os.makedirs(os.path.dirname(os.path.abspath(self.cache_file_path)), exist_ok=True)
            with open(self.cache_file_path, "w", encoding="utf-8") as f:
                json.dump(self._raw_data, f)
            logger.info(f"Successfully cached {len(self._raw_data)} instruments to {self.cache_file_path}")
        except Exception as e:
            logger.error(f"Failed downloading Angel One Scrip Master: {e}")
            if os.path.exists(self.cache_file_path) and os.path.getsize(self.cache_file_path) > 1000:
                logger.info("Falling back to existing local disk cache.")
                with open(self.cache_file_path, "r", encoding="utf-8") as f:
                    self._raw_data = json.load(f)
            else:
                raise RuntimeError(f"Unable to initialize Scrip Master: Download failed and no cache available. Error: {e}")

    def _parse_expiry(self, expiry_input: Any) -> str:
        """
        Standardizes various UI date formats (YYYY-MM-DD, DD-MMM-YYYY, DDMMMYYYY)
        to standard Angel One format: DDMMMYYYY (e.g., '13OCT2026' or '27OCT2026').
        """
        if not expiry_input:
            return ""

        if isinstance(expiry_input, (datetime.date, datetime.datetime)):
            return expiry_input.strftime("%d%b%Y").upper()

        exp_str = str(expiry_input).strip().upper()
        # Common UI date formats
        formats = [
            "%Y-%m-%d", "%d-%b-%Y", "%d%b%Y", "%d-%m-%Y",
            "%Y/%m/%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"
        ]

        for fmt in formats:
            try:
                dt = datetime.datetime.strptime(exp_str, fmt)
                return dt.strftime("%d%b%Y").upper()
            except ValueError:
                pass

        return exp_str

    def _build_indexes(self):
        """Builds fast in-memory composite hash tables for instant O(1) F&O scrip lookup."""
        self._indexed_fo.clear()
        self._token_map.clear()
        self._trading_symbol_map.clear()

        for item in self._raw_data:
            exch = item.get("exch_seg", "").upper()
            token = str(item.get("token", "")).strip()
            tsym = item.get("symbol", "").upper().strip()

            if token:
                self._token_map[token] = item
            if tsym:
                self._trading_symbol_map[tsym] = item

            # We focus indexing on Derivative segments (NFO & BFO)
            if exch in ("NFO", "BFO"):
                name = item.get("name", "").upper().strip()
                parsed_expiry = self._parse_expiry(item.get("expiry", ""))
                composite_key = (name, parsed_expiry, exch)

                if composite_key not in self._indexed_fo:
                    self._indexed_fo[composite_key] = []
                self._indexed_fo[composite_key].append(item)

        logger.info(f"Indexed {len(self._indexed_fo)} F&O keys across {len(self._raw_data)} total instruments.")

    def lookup_fo_instrument(
        self,
        symbol: str,
        expiry: str,
        strike: Optional[Union[float, int, str]] = None,
        option_type: Optional[str] = None,
        exchange: str = "NFO",
        tradingsymbol: Optional[str] = None,
        symboltoken: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Looks up exact symboltoken, tradingsymbol, and lot_size for F&O contracts.

        Returns:
            Dict containing:
            {
                "symboltoken": "44442",
                "tradingsymbol": "NIFTY13OCT2620050CE",
                "lotsize": 65,
                "exchange": "NFO",
                "instrumenttype": "OPTIDX",
                "tick_size": 0.05
            }
        """
        # If tradingsymbol or token provided directly by UI, check direct index
        if symboltoken and symboltoken in self._token_map:
            item = self._token_map[symboltoken]
            return {
                "symboltoken": str(item.get("token")),
                "tradingsymbol": str(item.get("symbol")),
                "lotsize": int(item.get("lotsize", 1) or 1),
                "exchange": str(item.get("exch_seg", exchange)).upper(),
                "instrumenttype": str(item.get("instrumenttype", "")),
                "tick_size": float(item.get("tick_size", 0.05) or 0.05)
            }

        if tradingsymbol and tradingsymbol.upper() in self._trading_symbol_map:
            item = self._trading_symbol_map[tradingsymbol.upper()]
            return {
                "symboltoken": str(item.get("token")),
                "tradingsymbol": str(item.get("symbol")),
                "lotsize": int(item.get("lotsize", 1) or 1),
                "exchange": str(item.get("exch_seg", exchange)).upper(),
                "instrumenttype": str(item.get("instrumenttype", "")),
                "tick_size": float(item.get("tick_size", 0.05) or 0.05)
            }

        if not symbol or not expiry:
            raise ValueError("Symbol and Expiry date are mandatory for F&O lookup.")

        sym_clean = symbol.strip().upper()
        exp_clean = self._parse_expiry(expiry)
        exch_clean = exchange.strip().upper() if exchange else "NFO"
        opt_clean = option_type.strip().upper() if option_type else None

        composite_key = (sym_clean, exp_clean, exch_clean)
        candidates = self._indexed_fo.get(composite_key, [])

        if not candidates:
            # Fallback search if symbol contained suffix like -EQ or name mismatch
            alt_sym = sym_clean.replace("-EQ", "").replace(" ", "")
            composite_key_alt = (alt_sym, exp_clean, exch_clean)
            candidates = self._indexed_fo.get(composite_key_alt, [])

        if not candidates:
            raise ValueError(
                f"No scrip found in Scrip Master for Underlying: '{sym_clean}', "
                f"Expiry: '{exp_clean}' on Exchange: '{exch_clean}'."
            )

        is_futures = (
            (opt_clean in ["FUT", "FUTURE", "FUTURES", "XX"]) or
            (strike is None or float(strike or 0) == 0)
        )

        for cand in candidates:
            itype = cand.get("instrumenttype", "").upper()
            tsym = cand.get("symbol", "").upper()

            if is_futures:
                if itype in ["FUTIDX", "FUTSTK"] or tsym.endswith("FUT"):
                    return {
                        "symboltoken": str(cand.get("token")),
                        "tradingsymbol": str(cand.get("symbol")),
                        "lotsize": int(cand.get("lotsize", 1) or 1),
                        "exchange": exch_clean,
                        "instrumenttype": itype,
                        "tick_size": float(cand.get("tick_size", 0.05) or 0.05)
                    }
            else:
                if opt_clean and not tsym.endswith(opt_clean):
                    continue

                try:
                    cand_strike = float(cand.get("strike", 0))
                    target_strike = float(strike)
                except (ValueError, TypeError):
                    continue

                # Angel One scrip master stores option strike either in standard units or multiplied by 100
                if abs(cand_strike - target_strike) < 0.01 or abs((cand_strike / 100.0) - target_strike) < 0.01:
                    return {
                        "symboltoken": str(cand.get("token")),
                        "tradingsymbol": str(cand.get("symbol")),
                        "lotsize": int(cand.get("lotsize", 1) or 1),
                        "exchange": exch_clean,
                        "instrumenttype": itype,
                        "tick_size": float(cand.get("tick_size", 0.05) or 0.05)
                    }

        raise ValueError(
            f"No matching F&O contract found for {sym_clean} Expiry:{exp_clean} "
            f"Strike:{strike} OptionType:{option_type} on {exch_clean}."
        )


def place_fo_order(
    ui_payload: Dict[str, Any],
    smart_connect_instance: Any,
    scrip_master: Optional[AngelScripMaster] = None
) -> Dict[str, Any]:
    """
    Parses, validates, maps, and executes Futures & Options orders via Angel One SmartAPI.

    Parameters:
        ui_payload (dict): UI input payload dictionary.
        smart_connect_instance (SmartConnect): Active authenticated SmartAPI session object.
        scrip_master (AngelScripMaster, optional): Instance of scrip master lookup service.

    Returns:
        dict: Standardized outcome dictionary:
              Success: {"status": "SUCCESS", "order_id": "...", "message": "...", "data": {...}}
              Failure: {"status": "FAILED", "error": "Detailed error string..."}
    """
    try:
        if not smart_connect_instance:
            return {
                "status": "FAILED",
                "error": "SmartConnect session is null or not authenticated. Please authenticate session first."
            }

        # 1. Enforce Exchange Mapping ("NFO" or "BFO")
        raw_exchange = str(ui_payload.get("exchange", "NFO")).upper()
        if raw_exchange not in ["NFO", "BFO"]:
            raw_exchange = "NFO"
        exchange = raw_exchange

        # 2. Scrip Lookup & Lot Size Retrieval
        symboltoken = ui_payload.get("symboltoken")
        tradingsymbol = ui_payload.get("tradingsymbol")
        lot_size = ui_payload.get("lotsize") or ui_payload.get("lot_size")

        if not symboltoken or not tradingsymbol or not lot_size:
            if not scrip_master:
                scrip_master = AngelScripMaster()

            scrip_info = scrip_master.lookup_fo_instrument(
                symbol=ui_payload.get("symbol") or ui_payload.get("underlying") or ui_payload.get("name", ""),
                expiry=ui_payload.get("expiry", ""),
                strike=ui_payload.get("strike"),
                option_type=ui_payload.get("option_type") or ui_payload.get("optiontype"),
                exchange=exchange,
                tradingsymbol=tradingsymbol,
                symboltoken=symboltoken
            )
            symboltoken = scrip_info["symboltoken"]
            tradingsymbol = scrip_info["tradingsymbol"]
            lot_size = scrip_info["lotsize"]

        # 3. Quantity Calculation: (UI Lots * Scrip Lot Size)
        raw_lots = ui_payload.get("lots") or ui_payload.get("quantity_lots") or ui_payload.get("no_of_lots") or 1
        try:
            lots_count = int(raw_lots)
            if lots_count <= 0:
                raise ValueError("Lots count must be a positive integer.")
        except Exception:
            return {"status": "FAILED", "error": f"Invalid lots parameter: '{raw_lots}'"}

        total_shares = lots_count * int(lot_size)
        quantity_str = str(total_shares)

        # 4. Product Type Mapping
        # Day / MIS -> INTRADAY | Overnight / Carryforward / Positional -> CARRYFORWARD
        raw_product = str(
            ui_payload.get("product_type") or
            ui_payload.get("producttype") or
            ui_payload.get("product", "CARRYFORWARD")
        ).upper()

        if raw_product in ["INTRADAY", "MIS", "DAY"]:
            product_type = "INTRADAY"
        else:
            product_type = "CARRYFORWARD"

        # 5. Order Type & Price Formatting
        raw_order_type = str(
            ui_payload.get("order_type") or
            ui_payload.get("ordertype") or "MARKET"
        ).upper()
        order_type = raw_order_type

        if order_type == "MARKET":
            price_str = "0"
        else:
            raw_price = ui_payload.get("price", 0)
            try:
                price_str = f"{float(raw_price):.2f}"
            except Exception:
                return {"status": "FAILED", "error": f"Invalid price format: '{raw_price}'"}

        trigger_price_str = "0"
        if "STOPLOSS" in order_type:
            raw_trigger = ui_payload.get("trigger_price") or ui_payload.get("triggerprice") or 0
            try:
                trigger_price_str = f"{float(raw_trigger):.2f}"
            except Exception:
                return {"status": "FAILED", "error": f"Invalid trigger price format: '{raw_trigger}'"}

        # 6. Transaction Type (BUY or SELL)
        transaction_type = str(
            ui_payload.get("transaction_type") or
            ui_payload.get("side") or
            ui_payload.get("transactiontype") or "BUY"
        ).upper()

        variety = str(ui_payload.get("variety", "NORMAL")).upper()

        # 7. Construct SmartAPI Order Parameters
        order_params = {
            "variety": variety,
            "tradingsymbol": tradingsymbol,
            "symboltoken": str(symboltoken),
            "transactiontype": transaction_type,
            "exchange": exchange,
            "ordertype": order_type,
            "producttype": product_type,
            "duration": "DAY",
            "price": price_str,
            "squareoff": "0",
            "stoploss": "0",
            "quantity": quantity_str
        }

        if "STOPLOSS" in order_type:
            order_params["triggerprice"] = trigger_price_str

        logger.info(f"Submitting F&O order to Angel One: {order_params}")

        # 8. Execute Order via SmartConnect instance inside Try-Except block
        res = smart_connect_instance.placeOrder(order_params)

        # Inspect Angel One SmartAPI Response Payload
        if isinstance(res, dict) and res.get("status") is True:
            data = res.get("data") or {}
            order_id = data.get("orderid") or res.get("orderid") or data.get("script") or "SUCCESS"
            return {
                "status": "SUCCESS",
                "order_id": str(order_id),
                "message": res.get("message", "Order placed successfully"),
                "data": data
            }
        else:
            if isinstance(res, dict):
                error_msg = res.get("message") or "Order execution rejected by broker."
                error_code = res.get("errorcode") or "UNKNOWN"
                error_str = f"{error_msg} (Error Code: {error_code})"
            else:
                error_str = str(res)

            logger.error(f"Angel One Order Placement Failed: {error_str}")
            return {
                "status": "FAILED",
                "error": error_str
            }

    except Exception as e:
        err_msg = str(e)
        logger.exception(f"Exception during F&O order placement: {err_msg}")
        return {
            "status": "FAILED",
            "error": f"Order Placement Exception: {err_msg}"
        }


# =====================================================================
# Security & Session Management Utilities
# =====================================================================

def generate_totp_code(totp_secret: str) -> str:
    """Generates a 6-digit TOTP code for automated Angel One 2FA authentication."""
    if not totp_secret:
        raise ValueError("TOTP secret key is missing.")

    clean_secret = totp_secret.strip().replace(" ", "").replace("-", "").upper()
    # Add Base32 padding if missing
    missing_padding = len(clean_secret) % 8
    if missing_padding:
        clean_secret += "=" * (8 - missing_padding)

    totp = pyotp.TOTP(clean_secret)
    return totp.now()


def authenticate_angel_session(
    api_key: str,
    client_id: str,
    pin: str,
    totp_secret: str
) -> Tuple[Any, Dict[str, Any]]:
    """
    Authenticates with Angel One SmartAPI using TOTP 2FA.

    SEBI Mandate Notice:
        Per SEBI regulatory directives for automated execution servers in India:
        1. API calls must originate from a SEBI-registered static IP address.
        2. Daily 2FA (TOTP) authentication is mandatory for API session generation.
        3. Never commit raw API credentials or TOTP secrets to source code.

    Returns:
        Tuple of (smart_connect_instance, session_data_dict)
    """
    from SmartApi import SmartConnect

    totp_code = generate_totp_code(totp_secret)
    smart_api = SmartConnect(api_key=api_key)

    session_res = smart_api.generateSession(client_id, pin, totp_code)

    if session_res and session_res.get("status") is True:
        logger.info(f"Angel One SmartAPI Session successfully established for Client: {client_id}")
        return smart_api, session_res.get("data", {})
    else:
        err_msg = session_res.get("message", "Authentication failed") if session_res else "No response from Angel One"
        err_code = session_res.get("errorcode", "AUTH_FAIL") if session_res else "500"
        raise PermissionError(f"SmartAPI Login Failed: {err_msg} (Code: {err_code})")


def verify_session_active(smart_connect_instance: Any) -> bool:
    """
    Verifies if the current SmartConnect session token is still active and valid.
    """
    if not smart_connect_instance:
        return False
    try:
        profile_res = smart_connect_instance.getProfile()
        return bool(profile_res and profile_res.get("status") is True)
    except Exception as e:
        logger.warning(f"Session health check failed: {e}")
        return False
