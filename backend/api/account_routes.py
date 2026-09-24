from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database.models import TradingAccountModel
from backend.security.encryption import vault
from backend.broker.angel_session import session_manager

router = APIRouter(prefix="/accounts", tags=["Accounts"])

class AccountCreatePayload(BaseModel):
  name: str
  broker: str = "Angel One"
  clientId: str
  apiKey: str = ""
  apiSecret: str = ""
  pin: str = ""
  totpSecret: str = ""

@router.get("")
def get_accounts(db: Session = Depends(get_db)):
  accounts = db.query(TradingAccountModel).all()

  result = []
  for acc in accounts:
    # Try fetching live margin from active session if enabled
    available_margin = acc.available_margin
    used_margin = acc.used_margin
    total_capital = acc.total_capital
    status = acc.status

    if acc.is_enabled and acc.encrypted_api_key:
      api_key = vault.decrypt(acc.encrypted_api_key) if acc.encrypted_api_key else ""
      pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
      totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
      
      session = session_manager.get_or_create_session(
        account_id=acc.id,
        client_id=acc.client_id,
        api_key=api_key,
        pin=pin,
        totp_secret=totp_secret
      )
      
      if session.status == "CONNECTED":
        rms = session.fetch_rms_limits()
        if rms.get("available_margin", 0.0) > 0:
          available_margin = rms["available_margin"]
          used_margin = rms["used_margin"]
          total_capital = rms["total_capital"]
          status = "Connected"

    result.append({
      "id": acc.id,
      "name": acc.name,
      "clientId": acc.client_id,
      "broker": acc.broker,
      "status": status,
      "availableMargin": available_margin,
      "usedMargin": used_margin,
      "totalCapital": total_capital,
      "todaysPnL": acc.todays_pnl,
      "openPositionsCount": acc.open_positions_count,
      "assignedAlgosCount": acc.assigned_algos_count,
      "lastHeartbeat": acc.last_heartbeat,
      "isEnabled": acc.is_enabled,
      "apiKeyConfigured": bool(acc.encrypted_api_key),
      "totpConfigured": bool(acc.encrypted_totp_secret),
      "pinConfigured": bool(acc.encrypted_pin)
    })
  return result

@router.post("")
def add_account(payload: AccountCreatePayload, db: Session = Depends(get_db)):
  new_id = f"acc-{payload.clientId.replace(' ', '')}"
  client_id_raw = payload.clientId.strip()

  existing_acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == new_id).first()
  if not existing_acc:
    existing_acc = db.query(TradingAccountModel).filter(TradingAccountModel.client_id == client_id_raw).first()

  if existing_acc:
    existing_acc.name = payload.name
    existing_acc.encrypted_api_key = vault.encrypt(payload.apiKey)
    existing_acc.encrypted_pin = vault.encrypt(payload.pin)
    existing_acc.encrypted_totp_secret = vault.encrypt(payload.totpSecret)
    existing_acc.is_enabled = True
    new_acc = existing_acc
  else:
    new_acc = TradingAccountModel(
      id=new_id,
      name=payload.name,
      client_id=client_id_raw,
      broker=payload.broker,
      status="Authenticating...",
      available_margin=0.0,
      used_margin=0.0,
      total_capital=0.0,
      todays_pnl=0.0,
      open_positions_count=0,
      assigned_algos_count=0,
      last_heartbeat="Just now",
      is_enabled=True,
      encrypted_api_key=vault.encrypt(payload.apiKey),
      encrypted_pin=vault.encrypt(payload.pin),
      encrypted_totp_secret=vault.encrypt(payload.totpSecret)
    )
    db.add(new_acc)

  db.commit()
  db.refresh(new_acc)

  # Test & initialize session immediately
  session = session_manager.get_or_create_session(
    account_id=new_acc.id,
    client_id=client_id_raw,
    api_key=payload.apiKey,
    pin=payload.pin,
    totp_secret=payload.totpSecret
  )

  success, msg = session.authenticate()
  if success:
    rms = session.fetch_rms_limits()
    new_acc.status = "Connected"
    new_acc.available_margin = rms.get("available_margin", 0.0)
    new_acc.used_margin = rms.get("used_margin", 0.0)
    new_acc.total_capital = rms.get("total_capital", 0.0)
    db.commit()
    db.refresh(new_acc)
    return {
      "id": new_acc.id,
      "name": new_acc.name,
      "clientId": new_acc.client_id,
      "broker": new_acc.broker,
      "status": new_acc.status,
      "availableMargin": new_acc.available_margin,
      "usedMargin": new_acc.used_margin,
      "totalCapital": new_acc.total_capital,
      "todaysPnL": new_acc.todays_pnl,
      "openPositionsCount": new_acc.open_positions_count,
      "assignedAlgosCount": new_acc.assigned_algos_count,
      "lastHeartbeat": new_acc.last_heartbeat,
      "isEnabled": new_acc.is_enabled,
      "apiKeyConfigured": bool(new_acc.encrypted_api_key),
      "totpConfigured": bool(new_acc.encrypted_totp_secret),
      "pinConfigured": bool(new_acc.encrypted_pin),
      "authMessage": msg
    }
  else:
    new_acc.status = "Authentication_Required"
    db.commit()
    raise HTTPException(status_code=400, detail=msg)

@router.patch("/{account_id}")
def update_account_status(account_id: str, isEnabled: bool, db: Session = Depends(get_db)):
  acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == account_id).first()
  if acc:
    acc.is_enabled = isEnabled
    acc.status = "Connected" if isEnabled else "Disconnected"
    db.commit()
  return {"success": True, "account_id": account_id, "isEnabled": isEnabled}

@router.put("/{account_id}")
def update_account_credentials(account_id: str, payload: AccountCreatePayload, db: Session = Depends(get_db)):
  acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == account_id).first()
  if not acc:
    raise HTTPException(status_code=404, detail="Account not found")

  if payload.name:
    acc.name = payload.name
  if payload.apiKey:
    acc.encrypted_api_key = vault.encrypt(payload.apiKey)
  if payload.pin:
    acc.encrypted_pin = vault.encrypt(payload.pin)
  if payload.totpSecret:
    acc.encrypted_totp_secret = vault.encrypt(payload.totpSecret)

  db.commit()
  db.refresh(acc)

  api_key = vault.decrypt(acc.encrypted_api_key) if acc.encrypted_api_key else ""
  pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
  totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""

  session = session_manager.get_or_create_session(
    account_id=acc.id,
    client_id=acc.client_id,
    api_key=api_key,
    pin=pin,
    totp_secret=totp_secret
  )

  success, msg = session.authenticate()
  if success:
    rms = session.fetch_rms_limits()
    acc.status = "Connected"
    acc.available_margin = rms.get("available_margin", 0.0)
    acc.used_margin = rms.get("used_margin", 0.0)
    acc.total_capital = rms.get("total_capital", 0.0)
  else:
    acc.status = "Authentication_Required"
  
  db.commit()
  db.refresh(acc)

  return {
    "id": acc.id,
    "name": acc.name,
    "clientId": acc.client_id,
    "broker": acc.broker,
    "status": acc.status,
    "availableMargin": acc.available_margin,
    "usedMargin": acc.used_margin,
    "totalCapital": acc.total_capital,
    "todaysPnL": acc.todays_pnl,
    "openPositionsCount": acc.open_positions_count,
    "assignedAlgosCount": acc.assigned_algos_count,
    "lastHeartbeat": acc.last_heartbeat,
    "isEnabled": acc.is_enabled,
    "apiKeyConfigured": bool(acc.encrypted_api_key),
    "totpConfigured": bool(acc.encrypted_totp_secret),
    "pinConfigured": bool(acc.encrypted_pin),
    "authMessage": msg
  }

@router.post("/{account_id}/test-connection")
def test_broker_connection(account_id: str, db: Session = Depends(get_db)):
  acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == account_id).first()
  if not acc:
    raise HTTPException(status_code=404, detail="Account not found")

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

  success, msg = session.authenticate()

  if success:
    rms = session.fetch_rms_limits()
    acc.status = "Connected"
    acc.available_margin = rms.get("available_margin", 0.0)
    acc.used_margin = rms.get("used_margin", 0.0)
    acc.total_capital = rms.get("total_capital", 0.0)
    db.commit()
    return {
      "success": True,
      "status": "Connected",
      "message": "Angel One SmartAPI Session Connected Successfully",
      "availableMargin": acc.available_margin,
      "totalCapital": acc.total_capital,
      "lastAuthenticated": session.last_authenticated.isoformat() if session.last_authenticated else "Just now"
    }
  else:
    acc.status = "Authentication_Required"
    db.commit()
    return {
      "success": False,
      "status": "Authentication_Required",
      "message": msg
    }

@router.post("/{account_id}/sync")
def sync_account_margin(account_id: str, db: Session = Depends(get_db)):
  acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == account_id).first()
  if not acc:
    raise HTTPException(status_code=404, detail="Account not found")

  api_key = vault.decrypt(acc.encrypted_api_key) if acc.encrypted_api_key else ""
  pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
  totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
  
  session = session_manager.get_or_create_session(
    account_id=acc.id,
    client_id=acc.client_id,
    api_key=api_key,
    pin=pin,
    totp_secret=totp_secret
  )

  rms = session.fetch_rms_limits()
  acc.available_margin = rms.get("available_margin", acc.available_margin)
  acc.used_margin = rms.get("used_margin", acc.used_margin)
  acc.total_capital = rms.get("total_capital", acc.total_capital)
  acc.status = session.status
  db.commit()

  return {
    "success": True,
    "account_id": acc.id,
    "availableMargin": acc.available_margin,
    "usedMargin": acc.used_margin,
    "totalCapital": acc.total_capital,
    "status": acc.status
  }

@router.delete("/{account_id}")
def delete_account(account_id: str, db: Session = Depends(get_db)):
  acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == account_id).first()
  if acc:
    db.delete(acc)
    db.commit()
  return {"success": True, "account_id": account_id, "message": "Account deleted successfully"}




