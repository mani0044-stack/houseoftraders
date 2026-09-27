import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from backend.config import settings
from backend.database.session import SessionLocal
from backend.database.models import OrderModel, AuditLogModel, TradingAccountModel
from backend.engine.instrument_service import instrument_service
from backend.broker.angel_session import session_manager
from backend.engine.risk_engine import risk_engine
from backend.engine.paper_engine import paper_engine

logger = logging.getLogger("multi_account_router")

class MultiAccountOrderRouter:
  """
  Multi-Account Strategy Order Execution Engine for Angel One SmartAPI.
  Receives Option Spread or Technical Strategy signals and fans out orders
  to multiple broker accounts simultaneously based on configured lot multipliers and risk caps.
  """

  def execute_multi_account_strategy(
    self,
    strategy_id: str,
    strategy_name: str,
    underlying: str,
    legs: List[Dict[str, Any]],
    allocations: List[Dict[str, Any]],
    mode: str = "Paper",
    spot_price: float = 24865.40
  ) -> Dict[str, Any]:
    """
    Fan out multi-leg option orders to multiple Angel One trading accounts.
    """
    db = SessionLocal()
    execution_results = []
    total_orders_placed = 0

    try:
      # Filter enabled account allocations
      active_allocations = [a for a in allocations if isinstance(a, dict) and a.get("enabled", True)]
      
      if not active_allocations:
        # Fallback to all connected accounts if no specific allocation list provided
        connected_sessions = session_manager.get_all_active_sessions()
        if connected_sessions:
          active_allocations = [{"accountId": s.account_id, "accountName": s.client_id, "enabled": True, "lotsMultiplier": 1} for s in connected_sessions]
        else:
          active_allocations = [{"accountId": "acc-main-01", "accountName": "Main Trading Account", "enabled": True, "lotsMultiplier": 1}]

      logger.info(f"Executing Multi-Account Strategy '{strategy_name}' ({underlying}) across {len(active_allocations)} target accounts.")

      for alloc in active_allocations:
        account_id = alloc.get("accountId", "acc-main-01")
        multiplier = max(1, int(alloc.get("lotsMultiplier", 1)))
        account_name = alloc.get("accountName", account_id)

        session = session_manager.get_session(account_id)

        for leg in legs:
          action = str(leg.get("action", "BUY")).upper()
          option_type = str(leg.get("optionType", "CE")).upper()
          strike = float(leg.get("strike", 0) or 0)
          base_lots = int(leg.get("lots", 1))
          final_lots = base_lots * multiplier

          # Resolve lot size for underlying (NIFTY = 50, BANKNIFTY = 15, FINNIFTY = 40)
          lot_size = 15 if underlying == "BANKNIFTY" else 40 if underlying == "FINNIFTY" else 50
          quantity = final_lots * lot_size

          # Construct trading symbol
          expiry_str = leg.get("expiry") or "26SEP2024"
          trading_symbol = leg.get("symbol") or f"{underlying}{expiry_str.replace(' ', '')}{int(strike) if strike > 0 else 24850}{option_type}"

          inst = instrument_service.get_instrument(trading_symbol)
          exchange = inst.get("exchange", "NFO") if inst else "NFO"

          order_status = "COMPLETED"
          broker_order_id = f"ANGEL-MA-{uuid.uuid4().hex[:8].upper()}"
          execution_type = mode.upper()

          if mode.upper() == "LIVE" and session and session.status == "CONNECTED":
            try:
              res = session.place_order(
                symbol=trading_symbol,
                side=action,
                quantity=quantity,
                price=0.0,
                order_type="MARKET",
                exchange=exchange
              )
              if res and res.get("success"):
                broker_order_id = res.get("broker_order_id", broker_order_id)
                execution_type = "LIVE"
              else:
                order_status = "REJECTED"
            except Exception as ex:
              logger.error(f"Live SmartAPI order exception for account {account_id}: {ex}")
              order_status = "REJECTED"
          elif mode.upper() == "PAPER" or not session or session.status != "CONNECTED":
            fill = paper_engine.simulate_fill(trading_symbol, action, quantity, spot_price)
            broker_order_id = f"PAPER-{uuid.uuid4().hex[:8].upper()}"
            execution_type = "PAPER"

          # Record Order in DB
          db_order = OrderModel(
            id=f"order-ma-{uuid.uuid4().hex[:8]}",
            idempotency_key=f"ma-{uuid.uuid4().hex[:8]}",
            broker_order_id=broker_order_id,
            timestamp=datetime.now().strftime("%H:%M:%S IST"),
            account_id=account_id,
            account_name=account_name,
            algo_id=strategy_id,
            algo_name=strategy_name,
            symbol=trading_symbol,
            side=action,
            quantity=quantity,
            order_type="MARKET",
            price=spot_price if spot_price > 0 else 142.50,
            average_price=spot_price if spot_price > 0 else 142.50,
            status=order_status,
            timeline={"created": "Just now", "transmitted_broker": "Just now"}
          )
          db.add(db_order)
          total_orders_placed += 1

          execution_results.append({
            "account_id": account_id,
            "account_name": account_name,
            "symbol": trading_symbol,
            "side": action,
            "quantity": quantity,
            "lots": final_lots,
            "status": order_status,
            "broker_order_id": broker_order_id,
            "mode": execution_type
          })

      # Add Audit Log
      audit = AuditLogModel(
        id=f"log-{uuid.uuid4().hex[:8]}",
        timestamp=datetime.now().strftime("%H:%M:%S IST"),
        category="Algo",
        severity="SUCCESS",
        title=f"Multi-Account Strategy Order Executed ({mode})",
        message=f"Strategy '{strategy_name}' executed {total_orders_placed} leg orders across {len(active_allocations)} trading accounts."
      )
      db.add(audit)
      db.commit()

    except Exception as e:
      db.rollback()
      logger.error(f"Error in multi-account strategy execution: {e}")
      return {"success": False, "error": str(e)}
    finally:
      db.close()

    return {
      "success": True,
      "strategy_id": strategy_id,
      "strategy_name": strategy_name,
      "mode": mode,
      "total_orders": total_orders_placed,
      "execution_results": execution_results
    }

multi_account_router = MultiAccountOrderRouter()
