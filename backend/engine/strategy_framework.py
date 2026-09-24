from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime

class Signal:
  def __init__(
    self,
    strategy_id: str,
    underlying: str,
    direction: str, # BULLISH, BEARISH
    action: str, # BUY, SELL
    strike_selection: str = "ATM",
    option_type: str = "Auto",
    expiry_selection: str = "NEAREST",
    timestamp: Optional[str] = None
  ):
    self.signal_id = f"sig_{strategy_id}_{int(datetime.utcnow().timestamp()*1000)}"
    self.strategy_id = strategy_id
    self.underlying = underlying
    self.direction = direction
    self.action = action
    self.strike_selection = strike_selection
    self.option_type = option_type
    self.expiry_selection = expiry_selection
    self.timestamp = timestamp or datetime.utcnow().isoformat()

  def to_dict(self) -> Dict[str, Any]:
    return {
      "signal_id": self.signal_id,
      "strategy_id": self.strategy_id,
      "underlying": self.underlying,
      "direction": self.direction,
      "action": self.action,
      "strike_selection": self.strike_selection,
      "option_type": self.option_type,
      "expiry_selection": self.expiry_selection,
      "timestamp": self.timestamp
    }

class BaseStrategy(ABC):
  """
  Abstract base class for all algorithmic strategies.
  Strategies DO NOT place broker orders directly; they ONLY generate Signals.
  """
  def __init__(self, strategy_id: str, name: str, config: Dict[str, Any]):
    self.strategy_id = strategy_id
    self.name = name
    self.config = config
    self.is_running = False
    self.is_paused = False

  @abstractmethod
  def initialize(self):
    pass

  @abstractmethod
  def on_tick(self, tick_data: Dict[str, Any]) -> Optional[Signal]:
    pass

  @abstractmethod
  def on_bar(self, bar_data: Dict[str, Any]) -> Optional[Signal]:
    pass

  def on_position_update(self, position_data: Dict[str, Any]):
    pass

  def on_order_update(self, order_data: Dict[str, Any]):
    pass

  def stop(self):
    self.is_running = False

  def pause(self):
    self.is_paused = True

  def resume(self):
    self.is_paused = False
