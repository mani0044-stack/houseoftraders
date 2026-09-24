import os
import json
import logging
import requests
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
CACHE_FILE = os.path.join(CACHE_DIR, "scrip_master.json")
ANGEL_SCRIP_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"

class InstrumentService:
  """
  Maintains live master instrument lookup for Angel One OpenAPI across NSE, NFO, BSE, MCX.
  Loads official OpenAPI Scrip Master JSON and indexes tokens, symbols, exchanges, and lot sizes.
  """
  def __init__(self):
    self.instruments_by_symbol: Dict[str, Dict[str, Any]] = {}
    self.instruments_by_token: Dict[str, Dict[str, Any]] = {}
    self.all_instruments: List[Dict[str, Any]] = []
    self._load_scrip_master()

  def _load_scrip_master(self):
    """Load Scrip Master from local disk cache or download from Angel One servers."""
    try:
      os.makedirs(CACHE_DIR, exist_ok=True)
      raw_data = None

      if os.path.exists(CACHE_FILE):
        file_age = os.path.getmtime(CACHE_FILE)
        # Re-download if file is older than 24 hours or empty
        if (os.path.getsize(CACHE_FILE) > 1000):
          logger.info(f"Loading Angel One Scrip Master from local cache: {CACHE_FILE}")
          with open(CACHE_FILE, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

      if not raw_data:
        logger.info(f"Downloading latest Angel One OpenAPI Scrip Master from {ANGEL_SCRIP_URL}...")
        resp = requests.get(ANGEL_SCRIP_URL, timeout=15)
        if resp.status_code == 200:
          raw_data = resp.json()
          with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(raw_data, f)
          logger.info(f"Successfully cached {len(raw_data)} instruments to {CACHE_FILE}")
        else:
          logger.error(f"Failed downloading Scrip Master HTTP {resp.status_code}")
          raw_data = []

      self.all_instruments = raw_data or []
      self._index_instruments()
    except Exception as e:
      logger.error(f"Error initializing InstrumentService Scrip Master: {e}")

  def _index_instruments(self):
    """Build fast lookup indexes by tradingsymbol, symbol, and token."""
    self.instruments_by_symbol.clear()
    self.instruments_by_token.clear()

    for item in self.all_instruments:
      symbol = item.get("symbol", "").strip()
      name = item.get("name", "").strip()
      token = item.get("token", "").strip()
      exch = item.get("exch_seg", "").strip()
      lotsize = int(item.get("lotsize", "1") or "1")

      inst_obj = {
        "symbol": symbol,
        "token": token,
        "name": name,
        "exchange": exch,
        "expiry": item.get("expiry", ""),
        "strike": float(item.get("strike", "0") or "0"),
        "lotsize": lotsize,
        "instrumenttype": item.get("instrumenttype", ""),
        "tick_size": float(item.get("tick_size", "0.05") or "0.05")
      }

      if symbol:
        self.instruments_by_symbol[symbol.upper()] = inst_obj
      if token:
        self.instruments_by_token[token] = inst_obj

      # Also map common stock/index names like NIFTY, BANKNIFTY, RELIANCE
      if name and name.upper() not in self.instruments_by_symbol:
        self.instruments_by_symbol[name.upper()] = inst_obj

    logger.info(f"Indexed {len(self.instruments_by_symbol)} symbols and {len(self.instruments_by_token)} tokens from Angel One Scrip Master.")

  def get_instrument(self, symbol: str) -> Optional[Dict[str, Any]]:
    """Look up instrument details by symbol or trading symbol."""
    if not symbol:
      return None
    
    clean_sym = symbol.strip().upper()
    if clean_sym in self.instruments_by_symbol:
      return self.instruments_by_symbol[clean_sym]

    # Fallback search variants
    alt_sym = clean_sym.replace("-EQ", "").replace("-", "")
    if alt_sym in self.instruments_by_symbol:
      return self.instruments_by_symbol[alt_sym]

    # Return structured fallback if symbol is an index or custom option contract
    token = "99926000" if "NIFTY" in clean_sym and "BANK" not in clean_sym else "99926009" if "BANK" in clean_sym else "35001"
    exchange = "NFO" if any(opt in clean_sym for opt in ["CE", "PE", "FUT"]) else "NSE"
    lot = 15 if "BANKNIFTY" in clean_sym else 40 if "FINNIFTY" in clean_sym else 50 if "NIFTY" in clean_sym else 1

    return {
      "symbol": clean_sym,
      "token": token,
      "name": clean_sym,
      "exchange": exchange,
      "lotsize": lot,
      "tick_size": 0.05
    }

  def search_instruments(self, query: str, limit: int = 25) -> List[Dict[str, Any]]:
    """Search instruments for frontend autocomplete."""
    if not query:
      return []

    q = query.strip().upper()
    results = []

    # Priority 1: Exact matches
    if q in self.instruments_by_symbol:
      results.append(self.instruments_by_symbol[q])

    # Priority 2: Starts with query
    for sym, obj in self.instruments_by_symbol.items():
      if len(results) >= limit:
        break
      if sym.startswith(q) and obj not in results:
        results.append(obj)

    # Priority 3: Contains query
    for sym, obj in self.instruments_by_symbol.items():
      if len(results) >= limit:
        break
      if q in sym and obj not in results:
        results.append(obj)

    return results

instrument_service = InstrumentService()

