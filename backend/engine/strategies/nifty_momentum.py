from typing import Dict, Any, Optional
from backend.engine.strategy_framework import BaseStrategy, Signal

class NiftyMomentumStrategy(BaseStrategy):
  def __init__(
    self,
    strategy_id: str = "nifty-momentum",
    name: str = "NIFTY Momentum",
    config: Optional[Dict[str, Any]] = None
  ):
    super().__init__(strategy_id, name, config or {})
    self.initialize()

  def initialize(self):
    self.is_running = True
    self.rsi_period = self.config.get("rsi_period", 14)
    self.ema_fast = self.config.get("ema_fast", 9)
    self.ema_slow = self.config.get("ema_slow", 21)

  def on_tick(self, tick_data: Dict[str, Any]) -> Optional[Signal]:
    if not self.is_running or self.is_paused:
      return None

    symbol = tick_data.get("symbol")
    if symbol != "NIFTY":
      return None

    ltp = tick_data.get("ltp", 0)
    change_pct = tick_data.get("changePercent", 0)

    # Momentum logic trigger
    if change_pct > 0.5:
      return Signal(
        strategy_id=self.strategy_id,
        underlying="NIFTY",
        direction="BULLISH",
        action="BUY",
        strike_selection="ITM 1",
        option_type="CE",
        expiry_selection="NEAREST"
      )
    elif change_pct < -0.5:
      return Signal(
        strategy_id=self.strategy_id,
        underlying="NIFTY",
        direction="BEARISH",
        action="BUY",
        strike_selection="ITM 1",
        option_type="PE",
        expiry_selection="NEAREST"
      )

    return None

  def on_bar(self, bar_data: Dict[str, Any]) -> Optional[Signal]:
    return None
