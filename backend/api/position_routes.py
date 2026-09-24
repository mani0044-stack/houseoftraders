import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.database.session import get_db
from backend.database.models import PositionModel, TradingAccountModel
from backend.broker.angel_session import session_manager
from backend.security.encryption import vault

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/positions", tags=["Positions"])

@router.get("")
def get_positions(db: Session = Depends(get_db)):
  db_positions = db.query(PositionModel).all()
  result = [
    {
      "id": pos.id,
      "accountId": pos.account_id,
      "accountName": pos.account_name,
      "symbol": pos.symbol,
      "underlying": pos.underlying,
      "expiry": pos.expiry,
      "strike": pos.strike,
      "type": pos.type,
      "quantity": pos.quantity,
      "averagePrice": pos.average_price,
      "ltp": pos.ltp,
      "unrealizedPnL": pos.unrealized_pnl,
      "pnlPercent": pos.pnl_percent,
      "realizedPnL": pos.realized_pnl,
      "algoId": pos.algo_id,
      "algoName": pos.algo_name,
      "status": pos.status,
      "entryTime": pos.entry_time
    }
    for pos in db_positions
  ]

  # Supplement with live positions directly from connected Angel One accounts
  accounts = db.query(TradingAccountModel).filter(TradingAccountModel.is_enabled == True).all()
  for acc in accounts:
    if acc.encrypted_api_key:
      api_key = vault.decrypt(acc.encrypted_api_key)
      pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
      totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
      
      session = session_manager.get_or_create_session(acc.id, acc.client_id, api_key, pin, totp_secret)
      if session.status == "CONNECTED":
        live_pos = session.fetch_positions()
        for lp in live_pos:
          net_qty = int(lp.get("netqty", 0) or 0)
          sym = lp.get("tradingsymbol", "")
          if sym and net_qty != 0:
            if not any(r["symbol"] == sym and r["accountId"] == acc.id for r in result):
              avg_p = float(lp.get("avgprice", 0.0) or lp.get("buyavgprice", 0.0) or 0.0)
              ltp = float(lp.get("ltp", 0.0) or avg_p)
              pnl = float(lp.get("pnl", 0.0) or (ltp - avg_p) * net_qty)
              
              result.append({
                "id": f"live-pos-{acc.id}-{sym}",
                "accountId": acc.id,
                "accountName": acc.name,
                "symbol": sym,
                "underlying": "BANKNIFTY" if "BANK" in sym else "FINNIFTY" if "FIN" in sym else "NIFTY",
                "expiry": lp.get("expirydate", "Live"),
                "strike": float(lp.get("strikeprice", 0.0) or 0.0),
                "type": "CE" if "CE" in sym else "PE" if "PE" in sym else "EQ",
                "quantity": net_qty,
                "averagePrice": avg_p,
                "ltp": ltp,
                "unrealizedPnL": pnl,
                "pnlPercent": round((pnl / (avg_p * abs(net_qty)) * 100), 2) if (avg_p and net_qty) else 0.0,
                "realizedPnL": float(lp.get("realisedpnl", 0.0) or 0.0),
                "algoId": "LIVE-SYNC",
                "algoName": "Angel One Live Sync",
                "status": "OPEN",
                "entryTime": "Live"
              })

  return result

@router.post("/{position_id}/exit")
def exit_position(position_id: str, db: Session = Depends(get_db)):
  pos = db.query(PositionModel).filter(PositionModel.id == position_id).first()
  if pos:
    acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == pos.account_id).first()
    if acc:
      api_key = vault.decrypt(acc.encrypted_api_key) if acc.encrypted_api_key else ""
      pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
      totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
      
      session = session_manager.get_or_create_session(acc.id, acc.client_id, api_key, pin, totp_secret)
      exit_side = "SELL" if pos.quantity > 0 else "BUY"
      try:
        session.place_order(
          symbol=pos.symbol,
          side=exit_side,
          quantity=abs(pos.quantity),
          order_type="MARKET"
        )
      except Exception as e:
        logger.error(f"Error placing position exit order for {pos.symbol}: {e}")

    pos.status = "CLOSED"
    pos.realized_pnl = pos.unrealized_pnl
    pos.quantity = 0
    db.commit()

  return {"success": True, "position_id": position_id, "status": "CLOSED"}

@router.post("/exit-all")
def exit_all_positions(db: Session = Depends(get_db)):
  positions = db.query(PositionModel).filter(PositionModel.status == "OPEN").all()
  for pos in positions:
    pos.status = "CLOSED"
    pos.realized_pnl = pos.unrealized_pnl
    pos.quantity = 0
  db.commit()
  return {"success": True, "message": "All open positions closed."}


