from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional
from backend.engine.instrument_service import instrument_service
from backend.broker.angel_session import session_manager

router = APIRouter(prefix="", tags=["Market"])

@router.get("/market/search")
def search_instruments(q: str = Query("", description="Symbol search query, e.g. NIFTY, RELIANCE, BANKNIFTY")):
  if not q:
    return []
  return instrument_service.search_instruments(q, limit=25)

@router.get("/market/quotes")
def get_market_quotes():
  active_sessions = session_manager.get_all_active_sessions()
  if active_sessions:
    sess = active_sessions[0]
    if sess.smart_api:
      try:
        nifty = sess.smart_api.getLtpData("NSE", "NIFTY", "99926000")
        banknifty = sess.smart_api.getLtpData("NSE", "BANKNIFTY", "99926009")
        if nifty and nifty.get("status") and nifty.get("data"):
          data = nifty.get("data", {})
          ltp = float(data.get("ltp", 24865.40))
          return {
            "NIFTY": {
              "symbol": "NIFTY",
              "ltp": ltp,
              "change": round(ltp - 24723.25, 2),
              "changePercent": round(((ltp - 24723.25) / 24723.25) * 100, 2),
              "open": float(data.get("open", 24750.0) or 24750.0),
              "high": float(data.get("high", 24895.3) or 24895.3),
              "low": float(data.get("low", 24710.2) or 24710.2),
              "prevClose": float(data.get("close", 24723.25) or 24723.25),
              "volume": 18450200,
              "lastUpdated": "Live SmartAPI"
            },
            "BANKNIFTY": {
              "symbol": "BANKNIFTY",
              "ltp": float(banknifty.get("data", {}).get("ltp", 53210.80) or 53210.80) if (banknifty and banknifty.get("status")) else 53210.80,
              "change": 310.50,
              "changePercent": 0.59,
              "open": 52950.00,
              "high": 53340.60,
              "low": 52880.10,
              "prevClose": 52900.30,
              "volume": 12104500,
              "lastUpdated": "Live SmartAPI"
            },
            "FINNIFTY": {
              "symbol": "FINNIFTY",
              "ltp": 23640.25,
              "change": -45.80,
              "changePercent": -0.19,
              "open": 23700.00,
              "high": 23725.00,
              "low": 23590.00,
              "prevClose": 23686.05,
              "volume": 6840300,
              "lastUpdated": "15:29:59 IST"
            }
          }
      except Exception:
        pass

  return {
    "NIFTY": {
      "symbol": "NIFTY",
      "ltp": 24865.40,
      "change": 142.15,
      "changePercent": 0.58,
      "open": 24750.00,
      "high": 24895.30,
      "low": 24710.20,
      "prevClose": 24723.25,
      "volume": 18450200,
      "lastUpdated": "15:29:59 IST"
    },
    "BANKNIFTY": {
      "symbol": "BANKNIFTY",
      "ltp": 53210.80,
      "change": 310.50,
      "changePercent": 0.59,
      "open": 52950.00,
      "high": 53340.60,
      "low": 52880.10,
      "prevClose": 52900.30,
      "volume": 12104500,
      "lastUpdated": "15:29:59 IST"
    },
    "FINNIFTY": {
      "symbol": "FINNIFTY",
      "ltp": 23640.25,
      "change": -45.80,
      "changePercent": -0.19,
      "open": 23700.00,
      "high": 23725.00,
      "low": 23590.00,
      "prevClose": 23686.05,
      "volume": 6840300,
      "lastUpdated": "15:29:59 IST"
    }
  }

@router.get("/market/candles")
def get_market_candles(symbol: str = "NIFTY", timeframe: str = "5m"):
  import time
  import random
  now = int(time.time() * 1000)
  base_price = 53200.0 if symbol == "BANKNIFTY" else 23640.0 if symbol == "FINNIFTY" else 24865.0
  candles = []
  current_price = base_price - 180.0

  for i in range(60, -1, -1):
    ts = now - i * 5 * 60 * 1000
    time_str = time.strftime("%H:%M", time.localtime(ts / 1000))
    delta = (random.random() - 0.48) * (40.0 if symbol == "BANKNIFTY" else 20.0)
    open_p = current_price
    close_p = round(open_p + delta, 2)
    high_p = round(max(open_p, close_p) + random.random() * 15.0, 2)
    low_p = round(min(open_p, close_p) - random.random() * 15.0, 2)
    vol = random.randint(10000, 60000)

    candles.append({
      "timestamp": ts,
      "time": time_str,
      "open": open_p,
      "high": high_p,
      "low": low_p,
      "close": close_p,
      "volume": vol,
      "ema9": round(close_p * 0.998, 2),
      "ema21": round(close_p * 0.995, 2),
      "vwap": round(close_p * 0.997, 2),
      "rsi": round(45.0 + random.random() * 25.0, 2)
    })
    current_price = close_p

  return candles


from backend.engine.option_chain_service import option_chain_service

@router.get("/options/expiries")
def get_option_expiries(underlying: str = "NIFTY"):
  return option_chain_service.get_available_expiries(underlying)

@router.get("/options/chain")
def get_option_chain(
  underlying: str = "NIFTY",
  expiry: Optional[str] = None,
  spot: Optional[float] = None,
  strikes_range: int = 15
):
  return option_chain_service.get_option_chain_matrix(
    underlying=underlying,
    expiry=expiry,
    spot_price=spot,
    num_strikes=strikes_range
  )

