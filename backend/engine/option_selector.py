from typing import Optional, Dict
from backend.engine.instrument_service import instrument_service, OptionInstrument

class OptionsSelector:
  """
  Reusable Options Selector that converts strategy intent (Underlying, Direction, Expiry, Strike Selection)
  into exact trading symbols, symbol tokens, strikes, lot sizes, and option types.
  """
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
    
    step = 100 if underlying == "BANKNIFTY" else 50
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

    offset_multiplier = strike_offset_map.get(strike_selection, 0)
    target_strike = explicit_strike if explicit_strike else (atm_strike + offset_multiplier * step)

    symbol = f"{underlying}24SEP{int(target_strike)}{target_type}"
    inst = instrument_service.get_instrument(symbol)

    if not inst:
      # Fallback instrument object
      lot_size = 15 if underlying == "BANKNIFTY" else 40 if underlying == "FINNIFTY" else 50
      return {
        "trading_symbol": symbol,
        "symbol_token": f"tok_{symbol}",
        "strike": target_strike,
        "expiry": "26SEP2024",
        "option_type": target_type,
        "lot_size": lot_size
      }

    return {
      "trading_symbol": inst.symbol,
      "symbol_token": inst.token,
      "strike": inst.strike,
      "expiry": inst.expiry,
      "option_type": inst.option_type,
      "lot_size": inst.lot_size
    }
