from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import logging

from backend.database.session import get_db
from backend.database.models import OrderModel, PositionModel, TradingAccountModel, AuditLogModel
from backend.broker.angel_session import session_manager
from backend.security.encryption import vault

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["Orders"])

class CreateOrderPayload(BaseModel):
  accountId: Optional[str] = "ALL" # Specific account ID or "ALL" for multi-account broadcast
  symbol: str
  side: str # BUY or SELL
  quantity: int = 50
  orderType: str = "MARKET" # MARKET, LIMIT
  productType: str = "CARRYFORWARD" # CARRYFORWARD, INTRADAY, DELIVERY
  price: float = 0.0
  algoId: Optional[str] = "MANUAL-01"
  algoName: Optional[str] = "Manual Dashboard Execution"

@router.get("")
def get_orders(db: Session = Depends(get_db)):
  db_orders = db.query(OrderModel).order_by(OrderModel.id.desc()).all()
  
  result = [
    {
      "id": ord.id,
      "brokerOrderId": ord.broker_order_id,
      "timestamp": ord.timestamp,
      "accountId": ord.account_id,
      "accountName": ord.account_name,
      "algoId": ord.algo_id,
      "algoName": ord.algo_name,
      "symbol": ord.symbol,
      "side": ord.side,
      "quantity": ord.quantity,
      "orderType": ord.order_type,
      "price": ord.price,
      "averagePrice": ord.average_price,
      "status": ord.status,
      "timeline": ord.timeline or {}
    }
    for ord in db_orders
  ]

  # Optionally supplement with live orderBook from active Angel One sessions
  accounts = db.query(TradingAccountModel).filter(TradingAccountModel.is_enabled == True).all()
  for acc in accounts:
    if acc.encrypted_api_key:
      api_key = vault.decrypt(acc.encrypted_api_key)
      pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
      totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
      
      session = session_manager.get_or_create_session(acc.id, acc.client_id, api_key, pin, totp_secret)
      if session.status == "CONNECTED":
        live_orders = session.fetch_orders()
        for lo in live_orders:
          b_id = str(lo.get("orderid") or lo.get("brokerorderid") or "")
          if b_id and not any(r["brokerOrderId"] == b_id for r in result):
            result.append({
              "id": f"live-{b_id}",
              "brokerOrderId": b_id,
              "timestamp": lo.get("updatetime") or lo.get("ordertag") or "Live",
              "accountId": acc.id,
              "accountName": acc.name,
              "algoId": "MANUAL-LIVE",
              "algoName": "Angel One Live Sync",
              "symbol": lo.get("tradingsymbol", ""),
              "side": lo.get("transactiontype", "BUY"),
              "quantity": int(lo.get("quantity", 0) or 0),
              "orderType": lo.get("ordertype", "MARKET"),
              "price": float(lo.get("price", 0.0) or 0.0),
              "averagePrice": float(lo.get("averageprice", 0.0) or lo.get("price", 0.0) or 0.0),
              "status": (lo.get("status") or "COMPLETED").upper(),
              "timeline": {"placed": "Live SmartAPI Sync"}
            })

  return result

@router.post("")
def create_order(payload: CreateOrderPayload, db: Session = Depends(get_db)):
  accounts_to_process = []

  if payload.accountId == "ALL" or not payload.accountId:
    accounts_to_process = db.query(TradingAccountModel).filter(TradingAccountModel.is_enabled == True).all()
    if not accounts_to_process:
      raise HTTPException(
        status_code=400,
        detail="No active trading accounts configured. Please add an Angel One account first."
      )
  else:
    target_acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == payload.accountId).first()
    if not target_acc:
      raise HTTPException(status_code=404, detail=f"Account '{payload.accountId}' not found.")
    accounts_to_process = [target_acc]

  results = []
  timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

  for acc in accounts_to_process:
    api_key = vault.decrypt(acc.encrypted_api_key) if acc.encrypted_api_key else ""
    pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
    totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
    client_id = acc.client_id

    session = session_manager.get_or_create_session(
      account_id=acc.id,
      client_id=client_id,
      api_key=api_key,
      pin=pin,
      totp_secret=totp_secret
    )

    try:
      exec_res = session.place_order(
        symbol=payload.symbol,
        side=payload.side,
        quantity=payload.quantity,
        price=payload.price,
        order_type=payload.orderType,
        product_type=payload.productType
      )
    except Exception as e:
      exec_res = {"success": False, "error": str(e)}

    if not exec_res.get("success"):
      err_msg = exec_res.get("error", "Order placement failed")
      if len(accounts_to_process) == 1:
        raise HTTPException(status_code=400, detail=f"Angel One Order Error ({acc.name}): {err_msg}")
      else:
        logger.warning(f"Order placement failed for {acc.name}: {err_msg}")
        continue

    broker_order_id = exec_res.get("broker_order_id", f"ANGEL-{uuid.uuid4().hex[:8]}")
    new_order_id = f"ord-{uuid.uuid4().hex[:8]}"

    order_entry = OrderModel(
      id=new_order_id,
      broker_order_id=broker_order_id,
      timestamp=timestamp_str,
      account_id=acc.id,
      account_name=acc.name,
      algo_id=payload.algoId,
      algo_name=payload.algoName,
      symbol=exec_res.get("symbol", payload.symbol),
      side=payload.side,
      quantity=payload.quantity,
      order_type=payload.orderType,
      price=payload.price if payload.price > 0 else 0.0,
      average_price=payload.price if payload.price > 0 else 0.0,
      status="COMPLETED",
      timeline={"placed": timestamp_str, "filled": timestamp_str}
    )
    db.add(order_entry)

    # Add audit log entry
    audit_entry = AuditLogModel(
      id=f"audit-{uuid.uuid4().hex[:8]}",
      timestamp=timestamp_str,
      category="Order Execution",
      severity="SUCCESS",
      title=f"Order {broker_order_id} Executed",
      message=f"{payload.side} {payload.quantity} {payload.symbol} placed via Angel One SmartAPI on account {acc.name} ({acc.client_id}). Broker Order ID: {broker_order_id}."
    )
    db.add(audit_entry)

    results.append({
      "id": order_entry.id,
      "brokerOrderId": order_entry.broker_order_id,
      "timestamp": order_entry.timestamp,
      "accountId": order_entry.account_id,
      "accountName": order_entry.account_name,
      "algoId": order_entry.algo_id,
      "algoName": order_entry.algo_name,
      "symbol": order_entry.symbol,
      "side": order_entry.side,
      "quantity": order_entry.quantity,
      "orderType": order_entry.order_type,
      "price": order_entry.price,
      "averagePrice": order_entry.average_price,
      "status": order_entry.status,
      "mode": "LIVE"
    })

  db.commit()

  if not results:
    raise HTTPException(status_code=400, detail="Failed to place orders across selected accounts. Check credentials and market session.")

  return results[0] if len(results) == 1 else {"success": True, "count": len(results), "orders": results}

@router.post("/{order_id}/cancel")
def cancel_order(order_id: str, db: Session = Depends(get_db)):
  order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
  if not order:
    order = db.query(OrderModel).filter(OrderModel.broker_order_id == order_id).first()
  
  if not order:
    raise HTTPException(status_code=404, detail="Order not found")

  acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == order.account_id).first()
  if acc:
    api_key = vault.decrypt(acc.encrypted_api_key) if acc.encrypted_api_key else ""
    pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
    totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
    
    session = session_manager.get_or_create_session(acc.id, acc.client_id, api_key, pin, totp_secret)
    session.cancel_order(order.broker_order_id)

  order.status = "CANCELLED"
  db.commit()
  return {"success": True, "orderId": order_id, "status": "CANCELLED"}



