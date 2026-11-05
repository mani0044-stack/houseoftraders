import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from backend.config import settings
from backend.database.session import SessionLocal
from backend.database.models import OrderModel, AuditLogModel, TradingAccountModel
from backend.broker.angel_session import session_manager
from backend.broker.fo_order_manager import get_scrip_master, normalize_order_type
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
          option_type = str(leg.get("optionType") or leg.get("option_type") or "CE").upper()
          strike = float(leg.get("strike", 0) or 0)

          base_lots = int(leg.get("lots", 1))
          final_lots = base_lots * multiplier

          from backend.engine.option_chain_service import option_chain_service
          expiry_str = leg.get("expiry") or ""
          if not expiry_str:
            expiries = option_chain_service.get_available_expiries(underlying)
            expiry_str = expiries[0] if expiries else ""
          exchange = "BFO" if underlying in ("SENSEX", "BANKEX") else "NFO"

          # If only a strike-selection label was given (ATM / OTM 1 / ITM 1), derive
          # the actual strike from the spot price and the real contract strike step.
          if strike <= 0:
            step = option_chain_service._strike_step(underlying, expiry_str) if expiry_str else 50
            atm = round(spot_price / step) * step
            offset_map = {
              "ATM": 0, "ITM 1": -1, "ITM 2": -2, "ITM 3": -3,
              "OTM 1": 1, "OTM 2": 2, "OTM 3": 3,
            }
            selection = str(leg.get("strikeSelection") or "ATM").upper()
            mult = offset_map.get(selection, 0)
            if option_type == "PE":
              mult = -mult
            strike = atm + mult * step

          # Resolve the EXACT contract and lot size from the Scrip Master.
          try:
            info = get_scrip_master().lookup_fo_instrument(
              symbol=underlying,
              expiry=expiry_str,
              strike=None if option_type in ("FUT", "FUTURE", "FUTURES") else strike,
              option_type=option_type,
              exchange=exchange,
            )
          except Exception as resolve_err:
            logger.error(
              f"Could not resolve {underlying} {expiry_str} {strike} {option_type}: {resolve_err}"
            )
            order_status = "REJECTED"
            execution_results.append({
              "account_id": account_id,
              "account_name": account_name,
              "symbol": leg.get("symbol") or f"{underlying}{expiry_str}{strike}{option_type}",
              "side": action,
              "quantity": 0,
              "lots": final_lots,
              "status": order_status,
              "error": str(resolve_err),
              "mode": mode.upper(),
            })
            continue

          trading_symbol = info["tradingsymbol"]
          exchange = info["exchange"]
          lot_size = int(info["lotsize"] or 1)
          quantity = final_lots * lot_size

          order_type = normalize_order_type(leg.get("orderType") or leg.get("order_type") or "MARKET")
          order_price = float(leg.get("price", 0.0) or 0.0)
          trigger_price = float(leg.get("triggerPrice") or leg.get("trigger_price") or 0.0)

          order_status = "COMPLETED"
          broker_order_id = f"ANGEL-MA-{uuid.uuid4().hex[:8].upper()}"
          execution_type = mode.upper()

          if mode.upper() == "LIVE" and session and session.status == "CONNECTED":
            try:
              res = session.place_order(
                symbol=trading_symbol,
                side=action,
                quantity=quantity,
                price=order_price,
                order_type=order_type,
                exchange=exchange,
                trigger_price=trigger_price,
                symboltoken=info["symboltoken"],
                tradingsymbol=trading_symbol,
                lotsize=lot_size,
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
            fill = paper_engine.simulate_fill(trading_symbol, action, quantity, spot_price, lot_size=lot_size)
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
            order_type=order_type,
            price=order_price if order_price > 0 else 0.0,
            average_price=order_price if order_price > 0 else 0.0,
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
            "lotsize": lot_size,
            "order_type": order_type,
            "price": order_price,
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
