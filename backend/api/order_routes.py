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
    try:
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
            raw_status = str(lo.get("status", "COMPLETED")).upper()
            mapped_status = "COMPLETED" if raw_status in ["COMPLETE", "COMPLETED"] else "CANCELLED" if raw_status in ["CANCELLED", "CANCELED"] else "REJECTED" if raw_status in ["REJECTED", "REJECT"] else "PENDING"
            result.append({
              "id": f"live-{b_id}",
              "brokerOrderId": b_id,
              "timestamp": lo.get("updatetime") or lo.get("ordertag") or "Live",
              "accountId": acc.id,
              "accountName": acc.name,
              "algoId": "MANUAL-LIVE",
              "algoName": "Angel One Live Sync",
              "symbol": lo.get("tradingsymbol", ""),
              "side": str(lo.get("transactiontype", "BUY")).upper(),
              "quantity": int(lo.get("quantity", 0) or 0),
              "orderType": str(lo.get("ordertype", "MARKET")).upper(),
              "price": float(lo.get("price", 0.0) or 0.0),
              "averagePrice": float(lo.get("averageprice", 0.0) or lo.get("price", 0.0) or 0.0),
              "status": mapped_status,
              "timeline": {"placed": "Live SmartAPI Sync"}
            })
    except Exception as e:
      logger.warning(f"Failed syncing live orders: {e}")

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

    # Automatically create or update open position in database
    sync_position_on_order(
      db=db,
      account_id=acc.id,
      account_name=acc.name,
      symbol=order_entry.symbol,
      side=payload.side,
      quantity=payload.quantity,
      price=payload.price,
      algo_id=payload.algoId or "MANUAL",
      algo_name=payload.algoName or "Manual Execution"
    )

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

def sync_position_on_order(db: Session, account_id: str, account_name: str, symbol: str, side: str, quantity: int, price: float, algo_id: str = "MANUAL", algo_name: str = "Manual Execution"):
    """Helper to update or create open position in database when an order executes."""
    try:
        underlying = "BANKNIFTY" if "BANK" in symbol else "FINNIFTY" if "FIN" in symbol else "SENSEX" if "SENSEX" in symbol else "NIFTY"
        pos_type = "CE" if "CE" in symbol else "PE" if "PE" in symbol else "EQ"
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        existing_pos = db.query(PositionModel).filter(
            PositionModel.account_id == account_id,
            PositionModel.symbol == symbol,
            PositionModel.status == "OPEN"
        ).first()

        change_qty = quantity if side.upper() == "BUY" else -quantity

        if existing_pos:
            new_qty = existing_pos.quantity + change_qty
            if new_qty == 0:
                existing_pos.status = "CLOSED"
                existing_pos.quantity = 0
                existing_pos.realized_pnl = existing_pos.unrealized_pnl
            else:
                existing_pos.quantity = new_qty
                if price > 0:
                    existing_pos.average_price = round((existing_pos.average_price + price) / 2.0, 2)
        else:
            new_pos = PositionModel(
                id=f"pos-{uuid.uuid4().hex[:8]}",
                account_id=account_id,
                account_name=account_name,
                symbol=symbol,
                underlying=underlying,
                expiry="Live",
                strike=0.0,
                type=pos_type,
                quantity=change_qty,
                average_price=price if price > 0 else 100.0,
                ltp=price if price > 0 else 100.0,
                unrealized_pnl=0.0,
                pnl_percent=0.0,
                realized_pnl=0.0,
                algo_id=algo_id,
                algo_name=algo_name,
                status="OPEN" if change_qty != 0 else "CLOSED",
                entry_time=timestamp_str
            )
            db.add(new_pos)
        db.commit()
    except Exception as e:
        logger.error(f"Failed syncing position for {symbol}: {e}")

@router.post("/place_fo")
def place_fo_order_route(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Direct F&O Order Execution wrapper route calling place_fo_order.
    """
    from backend.broker.fo_order_manager import place_fo_order, AngelScripMaster
    scrip_master = AngelScripMaster()

    target_acc_id = payload.get("accountId")
    target_acc = None
    if target_acc_id and target_acc_id != "ALL":
        target_acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == target_acc_id).first()
    if not target_acc:
        target_acc = db.query(TradingAccountModel).filter(TradingAccountModel.is_enabled == True).first()

    smart_api = None
    acc_id = "acc-demo"
    acc_name = "Angel One Demo Session"

    if target_acc and target_acc.encrypted_api_key:
        api_key = vault.decrypt(target_acc.encrypted_api_key) if target_acc.encrypted_api_key else ""
        pin = vault.decrypt(target_acc.encrypted_pin) if target_acc.encrypted_pin else ""
        totp_secret = vault.decrypt(target_acc.encrypted_totp_secret) if target_acc.encrypted_totp_secret else ""
        
        session = session_manager.get_or_create_session(
            account_id=target_acc.id,
            client_id=target_acc.client_id,
            api_key=api_key,
            pin=pin,
            totp_secret=totp_secret
        )
        if session.status != "CONNECTED":
            session.authenticate()
        
        if session.status == "CONNECTED":
            smart_api = session.smart_api
            acc_id = target_acc.id
            acc_name = target_acc.name

    # If no connected live session, place order in DB demo/paper mode
    if not smart_api:
        try:
            scrip_info = scrip_master.lookup_fo_instrument(
                symbol=payload.get("symbol") or payload.get("underlying") or "NIFTY",
                expiry=payload.get("expiry", "2026-10-27"),
                strike=payload.get("strike"),
                option_type=payload.get("option_type") or payload.get("optiontype"),
                exchange=payload.get("exchange", "NFO")
            )
            lots = int(payload.get("lots") or 1)
            total_qty = lots * scrip_info["lotsize"]
            mock_order_id = f"ANGEL-{uuid.uuid4().hex[:8].upper()}"
            exec_price = float(payload.get("price", 0.0) or 145.50)
            trade_side = str(payload.get("transaction_type", "BUY")).upper()

            timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            order_entry = OrderModel(
                id=f"ord-{uuid.uuid4().hex[:8]}",
                broker_order_id=mock_order_id,
                timestamp=timestamp_str,
                account_id=acc_id,
                account_name=acc_name,
                algo_id="FO-MANUAL",
                algo_name="F&O Manual Execution",
                symbol=scrip_info["tradingsymbol"],
                side=trade_side,
                quantity=total_qty,
                order_type=str(payload.get("order_type", "MARKET")).upper(),
                price=exec_price,
                average_price=exec_price,
                status="COMPLETED",
                timeline={"placed": timestamp_str, "filled": timestamp_str}
            )
            db.add(order_entry)
            db.commit()

            # Sync open position in database
            sync_position_on_order(
                db=db,
                account_id=acc_id,
                account_name=acc_name,
                symbol=scrip_info["tradingsymbol"],
                side=trade_side,
                quantity=total_qty,
                price=exec_price
            )

            return {
                "status": "SUCCESS",
                "order_id": mock_order_id,
                "message": f"F&O Order placed successfully for {scrip_info['tradingsymbol']}",
                "data": {
                    "orderid": mock_order_id,
                    "tradingsymbol": scrip_info["tradingsymbol"],
                    "symboltoken": scrip_info["symboltoken"],
                    "quantity": total_qty,
                    "lots": lots
                }
            }
        except Exception as e:
            return {"status": "FAILED", "error": str(e)}

    # Call production place_fo_order wrapper
    res = place_fo_order(payload, smart_api, scrip_master)
    if res.get("status") == "SUCCESS":
        tsym = payload.get("tradingsymbol") or payload.get("symbol", "NIFTY")
        qty = int(payload.get("lots", 1)) * 50
        side_val = str(payload.get("transaction_type", "BUY")).upper()
        p_val = float(payload.get("price", 0.0) or 0.0)
        sync_position_on_order(db, acc_id, acc_name, tsym, side_val, qty, p_val)

    return res




