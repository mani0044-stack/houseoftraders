"""
Angel One SmartAPI F&O Order Execution & Scrip Master Manager Module
-------------------------------------------------------------------
Author: Quant Developer
Description: Production-ready backend script for validating, parsing, lookup,
             and executing Futures & Options (F&O) orders using Angel One SmartAPI.
"""

import os
import re
import json
import logging
import datetime
import requests
import pyotp
from typing import Dict, Any, Optional, Tuple, Union

import backend.broker.patch_smartapi  # Apply SmartConnect placeOrder and IP patches
from backend.broker.patch_smartapi import enforce_static_ip_egress
from backend.broker.rejection_analyzer import diagnose_rejection, pre_validate_order, calculate_order_slices

logger = logging.getLogger(__name__)

# Official Angel One OpenAPI Scrip Master Endpoint
ANGEL_SCRIP_MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"

# Angel One SmartAPI order types (these are the ONLY values the broker accepts)
MARKET = "MARKET"
LIMIT = "LIMIT"
STOPLOSS_LIMIT = "STOPLOSS_LIMIT"
STOPLOSS_MARKET = "STOPLOSS_MARKET"

_ORDER_TYPE_ALIASES = {
    "M": MARKET,
    "MKT": MARKET,
    "MARKET": MARKET,
    "L": LIMIT,
    "LIM": LIMIT,
    "LIMIT": LIMIT,
    "SL": STOPLOSS_LIMIT,
    "SL-L": STOPLOSS_LIMIT,
    "SL_LIMIT": STOPLOSS_LIMIT,
    "STOPLOSS": STOPLOSS_LIMIT,
    "STOP_LOSS": STOPLOSS_LIMIT,
    "STOPLOSS_LIMIT": STOPLOSS_LIMIT,
    "STOP_LOSS_LIMIT": STOPLOSS_LIMIT,
    "SL-M": STOPLOSS_MARKET,
    "SLM": STOPLOSS_MARKET,
    "SL_M": STOPLOSS_MARKET,
    "STOPLOSS_MARKET": STOPLOSS_MARKET,
    "STOP_LOSS_MARKET": STOPLOSS_MARKET,
}

_OPTION_SYMBOL_RE = re.compile(r"^([A-Z]+)(\d{2}[A-Z]{3}\d{2})(\d+)(CE|PE)$")
_FUT_SYMBOL_RE = re.compile(r"^([A-Z]+)(\d{2}[A-Z]{3}\d{2})FUT$")

# Module level cached Scrip Master. Loading/indexing 150k+ instruments is expensive,
# so it must be created once per process instead of per API request.
_SCRIP_MASTER_SINGLETON: Optional["AngelScripMaster"] = None


def get_scrip_master() -> "AngelScripMaster":
    """Return the process-wide AngelScripMaster singleton."""
    global _SCRIP_MASTER_SINGLETON
    if _SCRIP_MASTER_SINGLETON is None:
        _SCRIP_MASTER_SINGLETON = AngelScripMaster()
    return _SCRIP_MASTER_SINGLETON


def normalize_order_type(raw_order_type: Any) -> str:
    """Map any UI/API alias (SL, SL-M, MKT, ...) to a valid Angel One order type."""
    cleaned = str(raw_order_type or MARKET).strip().upper().replace(" ", "_")
    return _ORDER_TYPE_ALIASES.get(cleaned, cleaned)


def is_stoploss_order(order_type: str) -> bool:
    return normalize_order_type(order_type) in (STOPLOSS_LIMIT, STOPLOSS_MARKET)


def safe_tick_size(raw_tick: Any) -> float:
    """
    Scrip Master reports tick sizes in paise (NFO options = 5.0, equity = 1.0).
    Convert them to rupees and fall back to the standard ₹0.05 tick.
    """
    try:
        tick = float(raw_tick or 0)
    except (TypeError, ValueError):
        return 0.05
    if tick <= 0:
        return 0.05
    if tick >= 1:
        tick = tick / 100.0
    return tick if tick >= 0.01 else 0.05


def round_to_tick(value: float, tick_size: float = 0.05) -> float:
    """Round a price to the instrument tick size."""
    tick = safe_tick_size(tick_size)
    return round(round(float(value) / tick) * tick, 4)


def build_price_fields(
    order_type: str,
    price: Any = 0,
    trigger_price: Any = 0,
    tick_size: float = 0.05,
) -> Tuple[Optional[str], str, Optional[str]]:
    """
    Build Angel One compatible price/triggerprice strings for an order type.

    Returns: (price_str, trigger_price_str, error_message)
      - MARKET / STOPLOSS_MARKET -> price "0"
      - LIMIT / STOPLOSS_LIMIT  -> price must be > 0
      - stoploss orders         -> trigger price must be > 0
    """
    ot = normalize_order_type(order_type)

    if ot in (MARKET, STOPLOSS_MARKET):
        price_str = "0"
    else:
        try:
            p = float(price or 0)
        except (TypeError, ValueError):
            return None, "0", f"Invalid price format: '{price}'"
        if p <= 0:
            return None, "0", f"A positive limit price is required for {ot} orders."
        price_str = f"{round_to_tick(p, tick_size):.2f}"

    trigger_str = "0"
    if ot in (STOPLOSS_LIMIT, STOPLOSS_MARKET):
        try:
            t = float(trigger_price or 0)
        except (TypeError, ValueError):
            return price_str, "0", f"Invalid trigger price format: '{trigger_price}'"
        if t <= 0:
            return price_str, "0", f"A positive trigger price is required for {ot} orders."
        trigger_str = f"{round_to_tick(t, tick_size):.2f}"

    return price_str, trigger_str, None


def parse_fo_symbol(tradingsymbol: str) -> Optional[Dict[str, Any]]:
    """
    Parse an Angel One F&O trading symbol into its components.

    Examples:
      NIFTY09NOV2620050CE -> NIFTY / 09NOV2026 / 20050.0 / CE
      BANKNIFTY27NOV2653000PE -> BANKNIFTY / 27NOV2026 / 53000.0 / PE
      NIFTY27NOV26FUT -> NIFTY / 27NOV2026 / None / FUT
    """
    if not tradingsymbol:
        return None

    sym = str(tradingsymbol).strip().upper().replace(" ", "")

    def expand(exp: str) -> str:
        # 09NOV26 -> 09NOV2026
        return f"{exp[:-2]}20{exp[-2:]}"

    match = _OPTION_SYMBOL_RE.match(sym)
    if match:
        underlying, exp, strike, option_type = match.groups()
        return {
            "underlying": underlying,
            "expiry": expand(exp),
            "strike": float(strike),
            "option_type": option_type,
        }

    match = _FUT_SYMBOL_RE.match(sym)
    if match:
        underlying, exp = match.groups()
        return {
            "underlying": underlying,
            "expiry": expand(exp),
            "strike": None,
            "option_type": "FUT",
        }

    return None

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

    def _item_to_info(self, item: Dict[str, Any], default_exchange: str = "NFO") -> Dict[str, Any]:
        return {
            "symboltoken": str(item.get("token")),
            "tradingsymbol": str(item.get("symbol")),
            "lotsize": int(item.get("lotsize", 1) or 1),
            "exchange": str(item.get("exch_seg", default_exchange)).upper(),
            "instrumenttype": str(item.get("instrumenttype", "")),
            # Normalise paise -> rupees (Scrip Master NFO options report 5.0 = ₹0.05)
            "tick_size": safe_tick_size(item.get("tick_size", 0.05)),
            "strike": float(item.get("strike", 0) or 0),
            "expiry": self._parse_expiry(item.get("expiry", "")),
        }

    def lookup_by_symbol(self, tradingsymbol: str) -> Optional[Dict[str, Any]]:
        """Exact trading-symbol lookup (option, future or equity) in the Scrip Master."""
        if not tradingsymbol:
            return None
        item = self._trading_symbol_map.get(str(tradingsymbol).strip().upper())
        return self._item_to_info(item) if item else None

    def lookup_by_token(self, symboltoken: str) -> Optional[Dict[str, Any]]:
        """Exact token lookup in the Scrip Master."""
        if not symboltoken:
            return None
        item = self._token_map.get(str(symboltoken).strip())
        return self._item_to_info(item) if item else None

    @staticmethod
    def _strike_matches(cand_strike: float, target_strike: float) -> bool:
        # Angel One stores option strikes multiplied by 100 (e.g. 2485000.0 for 24850)
        return (
            abs(cand_strike - target_strike) < 0.01 or
            abs((cand_strike / 100.0) - target_strike) < 0.01
        )

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

        IMPORTANT: Any token/tradingsymbol supplied by the UI is treated as a hint only.
        It is used ONLY when it matches the requested underlying/expiry/strike/option type.
        Otherwise the canonical contract is resolved from the Scrip Master, which prevents
        stale UI tokens from routing an order to the wrong strike.

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
        sym_clean = (symbol or "").strip().upper()
        exp_clean = self._parse_expiry(expiry) if expiry else ""
        exch_clean = exchange.strip().upper() if exchange else "NFO"
        opt_clean = option_type.strip().upper() if option_type else None

        target_strike: Optional[float] = None
        try:
            if strike is not None and str(strike).strip() != "":
                target_strike = float(strike)
        except (TypeError, ValueError):
            target_strike = None
        if target_strike == 0:
            target_strike = None

        def matches(item: Dict[str, Any]) -> bool:
            item_exch = str(item.get("exch_seg", "")).upper()
            item_name = str(item.get("name", "")).upper()
            item_tsym = str(item.get("symbol", "")).upper()
            if exch_clean and item_exch and item_exch != exch_clean:
                return False
            if exp_clean and self._parse_expiry(item.get("expiry", "")) != exp_clean:
                return False
            if sym_clean and item_name != sym_clean and item_tsym != sym_clean:
                return False
            if opt_clean and opt_clean not in ("FUT", "FUTURE", "FUTURES", "XX"):
                if not item_tsym.endswith(opt_clean):
                    return False
            if target_strike is not None:
                try:
                    if not self._strike_matches(float(item.get("strike", 0)), target_strike):
                        return False
                except (TypeError, ValueError):
                    return False
            return True

        # Use UI supplied token/symbol only if it genuinely matches the requested contract
        if symboltoken and symboltoken in self._token_map:
            item = self._token_map[symboltoken]
            if matches(item):
                return self._item_to_info(item, exch_clean)
            logger.warning(
                "UI supplied symboltoken %s (%s) does not match requested contract "
                "%s %s %s %s - ignoring stale token and re-resolving.",
                symboltoken, item.get("symbol"), sym_clean, exp_clean, strike, option_type
            )

        if tradingsymbol and tradingsymbol.upper() in self._trading_symbol_map:
            item = self._trading_symbol_map[tradingsymbol.upper()]
            if matches(item):
                return self._item_to_info(item, exch_clean)
            logger.warning(
                "UI supplied tradingsymbol %s does not match requested contract "
                "%s %s %s %s - ignoring stale symbol and re-resolving.",
                tradingsymbol, sym_clean, exp_clean, strike, option_type
            )

        # If no expiry was supplied but an exact trading symbol was, return it directly.
        if not exp_clean and tradingsymbol and tradingsymbol.upper() in self._trading_symbol_map:
            return self._item_to_info(self._trading_symbol_map[tradingsymbol.upper()], exch_clean)
        if not exp_clean and symboltoken and symboltoken in self._token_map:
            return self._item_to_info(self._token_map[symboltoken], exch_clean)

        if not sym_clean or not exp_clean:
            raise ValueError("Symbol and Expiry date are mandatory for F&O lookup.")

        composite_key = (sym_clean, exp_clean, exch_clean)
        candidates = self._indexed_fo.get(composite_key, [])

        if not candidates:
            # Fallback search if symbol contained suffix like -EQ or name mismatch
            alt_sym = sym_clean.replace("-EQ", "").replace(" ", "")
            composite_key_alt = (alt_sym, exp_clean, exch_clean)
            candidates = self._indexed_fo.get(composite_key_alt, [])

        if not candidates and exch_clean == "NFO":
            # Sensex contracts live on BFO; allow transparent cross-exchange lookup
            alt_key = (sym_clean, exp_clean, "BFO")
            candidates = self._indexed_fo.get(alt_key, [])
            if candidates:
                exch_clean = "BFO"

        if not candidates:
            raise ValueError(
                f"No scrip found in Scrip Master for Underlying: '{sym_clean}', "
                f"Expiry: '{exp_clean}' on Exchange: '{exch_clean}'."
            )

        is_futures = (
            (opt_clean in ["FUT", "FUTURE", "FUTURES", "XX"]) or
            (opt_clean is None and target_strike is None)
        )

        if not is_futures and target_strike is None:
            raise ValueError(
                f"Strike price is required to resolve {sym_clean} {exp_clean} {opt_clean} contract."
            )

        for cand in candidates:
            itype = cand.get("instrumenttype", "").upper()
            tsym = cand.get("symbol", "").upper()

            if is_futures:
                if itype in ["FUTIDX", "FUTSTK"] or tsym.endswith("FUT"):
                    return self._item_to_info(cand, exch_clean)
            else:
                if opt_clean and not tsym.endswith(opt_clean):
                    continue

                try:
                    cand_strike = float(cand.get("strike", 0))
                except (ValueError, TypeError):
                    continue

                if self._strike_matches(cand_strike, target_strike):
                    return self._item_to_info(cand, exch_clean)

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
        #    The canonical contract is ALWAYS re-resolved from the Scrip Master.
        #    UI supplied token/symbol/lotsize are only hints and must match the
        #    requested underlying + expiry + strike + option type.
        if not scrip_master:
            scrip_master = get_scrip_master()

        requested_symbol = (
            ui_payload.get("symbol") or
            ui_payload.get("underlying") or
            ui_payload.get("name", "")
        )
        requested_expiry = ui_payload.get("expiry", "")
        requested_strike = ui_payload.get("strike")
        requested_option_type = ui_payload.get("option_type") or ui_payload.get("optiontype")
        ui_symboltoken = ui_payload.get("symboltoken")
        ui_tradingsymbol = ui_payload.get("tradingsymbol")

        # If the UI supplied a symbol only (no underlying), parse the contract out of it.
        if not requested_expiry or requested_strike in (None, "", 0):
            parsed = parse_fo_symbol(ui_tradingsymbol or requested_symbol)
            if parsed:
                requested_symbol = parsed["underlying"]
                requested_expiry = parsed["expiry"]
                if requested_strike in (None, "", 0):
                    requested_strike = parsed["strike"]
                if not requested_option_type:
                    requested_option_type = parsed["option_type"]
                exchange = "BFO" if parsed["underlying"] in ("SENSEX", "BANKEX") else exchange

        try:
            scrip_info = scrip_master.lookup_fo_instrument(
                symbol=requested_symbol,
                expiry=requested_expiry,
                strike=requested_strike,
                option_type=requested_option_type,
                exchange=exchange,
                tradingsymbol=ui_tradingsymbol,
                symboltoken=ui_symboltoken
            )
        except Exception as lookup_err:
            # Never silently fall back to a UI token - that is how orders end up
            # on the wrong strike. Fail loudly instead.
            return {
                "status": "FAILED",
                "error": f"Could not resolve exact contract for the requested strike: {lookup_err}",
                "error_code": "CONTRACT_RESOLUTION_FAILED",
                "factor": "INVALID_SYMBOL_TOKEN",
                "factor_title": "Contract Resolution",
                "factor_badge": "WRONG / UNRESOLVED CONTRACT",
                "factor_color": "rose",
                "factor_summary": "The requested strike/expiry could not be matched to an Angel One instrument.",
                "explanation": str(lookup_err),
                "actionable_solution": (
                    "1. Verify the expiry date is a valid, non-expired F&O expiry.\n"
                    "2. Verify the strike is a valid strike step for the underlying.\n"
                    "3. Refresh the Scrip Master (backend/data/scrip_master.json)."
                ),
                "suggested_action": "CHECK_CONTRACT",
                "additional_data": {
                    "symbol": requested_symbol,
                    "expiry": requested_expiry,
                    "strike": requested_strike,
                    "option_type": requested_option_type,
                    "exchange": exchange,
                },
                "all_factors_evaluated": [],
            }

        symboltoken = scrip_info["symboltoken"]
        tradingsymbol = scrip_info["tradingsymbol"]
        lot_size = int(scrip_info["lotsize"] or 1)
        tick_size = safe_tick_size(scrip_info.get("tick_size", 0.05))
        exchange = scrip_info.get("exchange", exchange)

        # 3. Quantity Calculation: (UI Lots * Scrip Master Lot Size)
        #    Lot size always comes from the resolved contract, never from the UI.
        raw_lots = (
            ui_payload.get("lots") or
            ui_payload.get("quantity_lots") or
            ui_payload.get("no_of_lots")
        )

        if raw_lots is None and ui_payload.get("quantity") is not None:
            # Caller supplied total quantity instead of lots. Snap it to whole lots.
            try:
                requested_qty = int(ui_payload.get("quantity"))
            except (TypeError, ValueError):
                return {"status": "FAILED", "error": f"Invalid quantity: '{ui_payload.get('quantity')}'"}
            if requested_qty <= 0:
                return {"status": "FAILED", "error": "Quantity must be a positive integer."}
            lots_count = max(1, requested_qty // lot_size)
        else:
            try:
                lots_count = int(raw_lots if raw_lots is not None else 1)
                if lots_count <= 0:
                    raise ValueError("Lots count must be a positive integer.")
            except Exception:
                return {"status": "FAILED", "error": f"Invalid lots parameter: '{raw_lots}'"}

        total_shares = lots_count * lot_size
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
        order_type = normalize_order_type(
            ui_payload.get("order_type") or
            ui_payload.get("ordertype") or MARKET
        )
        if order_type not in (MARKET, LIMIT, STOPLOSS_LIMIT, STOPLOSS_MARKET):
            return {"status": "FAILED", "error": f"Unsupported order type: '{order_type}'"}

        raw_trigger = (
            ui_payload.get("trigger_price") or
            ui_payload.get("triggerprice") or
            ui_payload.get("trigger") or 0
        )
        price_str, trigger_price_str, price_err = build_price_fields(
            order_type=order_type,
            price=ui_payload.get("price", 0),
            trigger_price=raw_trigger,
            tick_size=tick_size,
        )
        if price_err:
            return {"status": "FAILED", "error": price_err, "error_code": "INVALID_ORDER_PRICE"}

        # 6. Transaction Type (BUY or SELL)
        transaction_type = str(
            ui_payload.get("transaction_type") or
            ui_payload.get("side") or
            ui_payload.get("transactiontype") or "BUY"
        ).upper()

        if transaction_type not in ("BUY", "SELL"):
            return {"status": "FAILED", "error": f"Invalid transaction type: '{transaction_type}'"}

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

        if order_type in (STOPLOSS_LIMIT, STOPLOSS_MARKET):
            order_params["triggerprice"] = trigger_price_str

        # 7.1 Pre-Trade Risk & Freeze Limit Validation
        # Pass the resolved quantity/order type so lot-size based freeze checks are exact.
        validation_payload = dict(ui_payload)
        validation_payload.update({
            "quantity": total_shares,
            "order_type": order_type,
            "price": price_str,
        })
        is_valid, warnings, pre_errors = pre_validate_order(validation_payload)
        if not is_valid and pre_errors:
            first_err = pre_errors[0]
            diagnosed = diagnose_rejection(
                {"message": first_err["message"], "errorCode": first_err["factor"]},
                validation_payload
            )
            return {
                "status": "FAILED",
                "error": diagnosed["raw_message"],
                "error_code": diagnosed["error_code"],
                "factor": diagnosed["factor"],
                "factor_title": diagnosed["factor_title"],
                "factor_badge": diagnosed["factor_badge"],
                "factor_color": diagnosed["factor_color"],
                "factor_summary": diagnosed["factor_summary"],
                "explanation": diagnosed["explanation"],
                "actionable_solution": diagnosed["actionable_solution"],
                "suggested_action": diagnosed["suggested_action"],
                "additional_data": diagnosed.get("additional_data", {}),
                "all_factors_evaluated": diagnosed["all_factors_evaluated"]
            }

        logger.info(f"Submitting F&O order to Angel One: {order_params}")

        # 8. Execute Order via SmartConnect instance inside Try-Except block
        #    Re-apply the static-IP proxy immediately before transmission so the
        #    order always exits from the whitelisted egress IP.
        enforce_static_ip_egress(smart_connect_instance, context="F&O order placement")
        res = smart_connect_instance.placeOrder(order_params)

        # Inspect Angel One SmartAPI Response Payload
        # Support both dictionary response (from patched SmartAPI) and string orderid
        resolved_info = {
            "tradingsymbol": tradingsymbol,
            "symboltoken": str(symboltoken),
            "exchange": exchange,
            "quantity": total_shares,
            "lots": lots_count,
            "lotsize": lot_size,
            "order_type": order_type,
            "price": float(price_str or 0),
            "trigger_price": float(trigger_price_str or 0),
        }

        if isinstance(res, str) and res.strip():
            order_id = res.strip()
            return {
                "status": "SUCCESS",
                "order_id": order_id,
                "message": "Order placed successfully",
                "data": {"orderid": order_id, **resolved_info}
            }

        if isinstance(res, dict) and (res.get("status") is True or res.get("success") is True):
            data = res.get("data") or {}
            order_id = data.get("orderid") or res.get("orderid") or data.get("script") or "SUCCESS"
            return {
                "status": "SUCCESS",
                "order_id": str(order_id),
                "message": res.get("message", "Order placed successfully"),
                "data": {**data, **resolved_info}
            }
        else:
            # Diagnose rejection against all 6 critical factors
            diagnosed = diagnose_rejection(res, ui_payload)
            logger.error(
                f"Angel One Order Placement Rejected [{diagnosed['factor']} / {diagnosed['error_code']}]: "
                f"{diagnosed['raw_message']}"
            )

            return {
                "status": "FAILED",
                "error": diagnosed["raw_message"],
                "error_code": diagnosed["error_code"],
                "factor": diagnosed["factor"],
                "factor_title": diagnosed["factor_title"],
                "factor_badge": diagnosed["factor_badge"],
                "factor_color": diagnosed["factor_color"],
                "factor_summary": diagnosed["factor_summary"],
                "explanation": diagnosed["explanation"],
                "actionable_solution": diagnosed["actionable_solution"],
                "suggested_action": diagnosed["suggested_action"],
                "additional_data": diagnosed.get("additional_data", {}),
                "all_factors_evaluated": diagnosed["all_factors_evaluated"]
            }

    except Exception as e:
        err_msg = str(e)
        logger.exception(f"Exception during F&O order placement: {err_msg}")
        diagnosed = diagnose_rejection(err_msg, ui_payload)
        return {
            "status": "FAILED",
            "error": diagnosed["raw_message"],
            "error_code": diagnosed["error_code"],
            "factor": diagnosed["factor"],
            "factor_title": diagnosed["factor_title"],
            "factor_badge": diagnosed["factor_badge"],
            "factor_color": diagnosed["factor_color"],
            "factor_summary": diagnosed["factor_summary"],
            "explanation": diagnosed["explanation"],
            "actionable_solution": diagnosed["actionable_solution"],
            "suggested_action": diagnosed["suggested_action"],
            "additional_data": diagnosed.get("additional_data", {}),
            "all_factors_evaluated": diagnosed["all_factors_evaluated"]
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
    from backend.config import settings

    totp_code = generate_totp_code(totp_secret)
    smart_api = SmartConnect(
        api_key=api_key,
        proxies=settings.angel_proxies,
    )

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
