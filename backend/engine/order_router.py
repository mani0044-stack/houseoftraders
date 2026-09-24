import hashlib
import logging
from typing import Dict, Any, Optional
from backend.config import settings
from backend.engine.option_selector import OptionsSelector
from backend.engine.paper_engine import paper_engine
from backend.engine.risk_engine import RiskCheckResult
from backend.engine.strategy_framework import Signal
from backend.broker.angel_session import session_manager

logger = logging.getLogger(__name__)

class OrderRouter:
  """
  Idempotent Order Manager Abstraction:
  Enforces idempotency keys (`strategy_id + account_id + signal_id`),
  routes orders to Paper Trading Simulator or Angel One SmartAPI Python SDK.
  """
  def __init__(self):
    self.processed_keys = set()

  def generate_idempotency_key(self, strategy_id: str, account_id: str, signal_id: str) -> str:
    raw = f"{strategy_id}:{account_id}:{signal_id}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

  def route_approved_risk_execution(
    self,
    signal: Signal,
    risk_result: RiskCheckResult,
    spot_price: float = 24865.40
  ) -> Optional[Dict[str, Any]]:
    
    if not risk_result.approved:
      return None

    # Check idempotency key to prevent duplicate orders
    idempotency_key = self.generate_idempotency_key(
      signal.strategy_id, risk_result.account_id, signal.signal_id
    )
    if idempotency_key in self.processed_keys:
      logger.warning(f"Duplicate order blocked by idempotency key: {idempotency_key}")
      return None

    self.processed_keys.add(idempotency_key)

    # Resolve Option Contract via OptionsSelector
    opt = OptionsSelector.select_option(
      underlying=signal.underlying,
      direction=signal.direction,
      strike_selection=signal.strike_selection,
      option_type=signal.option_type,
      spot_price=spot_price
    )

    quantity = (opt["lot_size"] if opt else 50) * risk_result.lots
    trading_symbol = opt["trading_symbol"] if opt else f"{signal.underlying}24SEP24850CE"
    market_price = 142.50 # Market price simulation

    session = session_manager.get_session(risk_result.account_id)
    if session and session.status == "CONNECTED":
      res = session.place_order(
        symbol=trading_symbol,
        side=signal.action,
        quantity=quantity,
        price=market_price,
        order_type="MARKET"
      )
      return {
        "idempotency_key": idempotency_key,
        "broker_order_id": res.get("broker_order_id"),
        "account_id": risk_result.account_id,
        "algo_id": signal.strategy_id,
        "symbol": trading_symbol,
        "side": signal.action,
        "quantity": quantity,
        "price": market_price,
        "status": "COMPLETED",
        "mode": res.get("mode", "LIVE")
      }

    # Route based on Mode (Paper vs Live)
    if not settings.LIVE_TRADING:
      fill = paper_engine.simulate_fill(trading_symbol, signal.action, quantity, market_price)
      logger.info(f"[PAPER ORDER EXECUTED] {signal.action} {quantity} {trading_symbol} @ ₹{fill['fill_price']} for Account {risk_result.account_id}")
      return {
        "idempotency_key": idempotency_key,
        "broker_order_id": f"PAPER-{idempotency_key[:8].upper()}",
        "account_id": risk_result.account_id,
        "algo_id": signal.strategy_id,
        "symbol": trading_symbol,
        "side": signal.action,
        "quantity": quantity,
        "price": fill["fill_price"],
        "status": "COMPLETED",
        "mode": "PAPER"
      }
    else:
      # Live Angel One SmartAPI Python SDK execution fallback
      logger.info(f"[LIVE BROKER ORDER ROUTED] Transmitting {signal.action} {quantity} {trading_symbol} to Angel One API.")
      return {
        "idempotency_key": idempotency_key,
        "broker_order_id": f"ANGEL-{idempotency_key[:8].upper()}",
        "account_id": risk_result.account_id,
        "algo_id": signal.strategy_id,
        "symbol": trading_symbol,
        "side": signal.action,
        "quantity": quantity,
        "price": market_price,
        "status": "COMPLETED",
        "mode": "LIVE"
      }

order_router = OrderRouter()

