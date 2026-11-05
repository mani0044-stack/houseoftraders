from typing import Optional, Dict
from backend.engine.instrument_service import instrument_service
from backend.broker.fo_order_manager import get_scrip_master

class OptionsSelector:
  """
  Reusable Options Selector that converts strategy intent (Underlying, Direction, Expiry, Strike Selection)
  into exact trading symbols, symbol tokens, strikes, lot sizes, and option types.
  """
  @staticmethod
  def _nearest_expiry(underlying: str, expiry_selection: str = "Nearest") -> str:
    from backend.engine.option_chain_service import option_chain_service
    expiries = option_chain_service.get_available_expiries(underlying)
    if not expiries:
      return ""
    # get_available_expiries already returns chronological order.
    if str(expiry_selection).strip().lower().startswith("month"):
      # Angel One index expiries are weekly; approximate monthly by the last listed
      # expiry within the nearest month.
      return expiries[-1]
    return expiries[0]

  @staticmethod
  def select_option(
    underlying: str,
    direction: str, # BULLISH or BEARISH
    strike_selection: str = "ATM", # ATM, ITM 1-3, OTM 1-3, Explicit
    option_type: str = "Auto", # CE, PE, Auto
    expiry_selection: str = "Nearest",
    spot_price: float = 24865.40,
    explicit_strike: Optional[float] = None
  ) -> Optional[Dict]:
    underlying = (underlying or "NIFTY").strip().upper()

    # Strike steps differ per underlying. Using the wrong step is what makes an
    # ATM signal resolve to a non-existent (or off-by-one) strike.
    if underlying in ("BANKNIFTY", "SENSEX", "BANKEX"):
      step = 100
    else:
      step = 50

    atm_strike = round(spot_price / step) * step

    # Determine CE vs PE based on Direction or explicit option_type
    if option_type == "Auto":
      target_type = "CE" if direction.upper() == "BULLISH" else "PE"
    else:
      target_type = option_type.upper()

    # Calculate target strike based on ATM/ITM/OTM offset
    strike_offset_map = {
      "ATM": 0,
      "ITM 1": -1 if target_type == "CE" else 1,
      "ITM 2": -2 if target_type == "CE" else 2,
      "ITM 3": -3 if target_type == "CE" else 3,
      "OTM 1": 1 if target_type == "CE" else -1,
      "OTM 2": 2 if target_type == "CE" else -2,
      "OTM 3": 3 if target_type == "CE" else -3,
    }

    offset_multiplier = strike_offset_map.get(str(strike_selection).strip().upper(), 0)
    target_strike = explicit_strike if explicit_strike else (atm_strike + offset_multiplier * step)

    expiry = OptionsSelector._nearest_expiry(underlying, expiry_selection)
    exchange = "BFO" if underlying in ("SENSEX", "BANKEX") else "NFO"
    if not expiry:
      return None

    try:
      info = get_scrip_master().lookup_fo_instrument(
        symbol=underlying,
        expiry=expiry,
        strike=target_strike,
        option_type=target_type,
        exchange=exchange,
      )
    except Exception:
      return None

    return {
      "trading_symbol": info["tradingsymbol"],
      "symbol_token": info["symboltoken"],
      "strike": target_strike,
      "expiry": info["expiry"],
      "option_type": target_type,
      "lot_size": int(info["lotsize"] or 1),
      "exchange": info["exchange"],
      "tick_size": float(info.get("tick_size", 0.05) or 0.05),
    }
