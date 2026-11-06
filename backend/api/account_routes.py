from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import logging
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database.models import TradingAccountModel
from backend.security.encryption import vault
from backend.broker.angel_session import session_manager
from backend.broker.proxy_config import (
  account_proxy_config,
  normalize_proxy_url,
  probe_proxy_egress,
  static_ip_for,
)
from backend.config import redact_secrets, settings

logger = logging.getLogger("algotrade")

router = APIRouter(prefix="/accounts", tags=["Accounts"])

class AccountCreatePayload(BaseModel):
  name: str
  broker: str = "Angel One"
  clientId: str
  apiKey: str = ""
  apiSecret: str = ""
  pin: str = ""
  totpSecret: str = ""
  # Per-account static-IP egress. The proxy URL is never echoed back to the UI.
  proxyUrl: Optional[str] = None
  staticIp: Optional[str] = None
  clearProxy: bool = False


def _decrypted_proxy_url(acc: TradingAccountModel) -> str:
  encrypted = getattr(acc, "encrypted_proxy_url", None)
  return vault.decrypt(encrypted) if encrypted else ""


def _proxy_fields(acc: TradingAccountModel) -> dict:
  """Credential-free static-IP/proxy facts for API responses."""
  proxy_url = _decrypted_proxy_url(acc)
  static_ip = getattr(acc, "static_ip", "") or ""
  config = account_proxy_config(proxy_url, static_ip)
  return {
    "proxyConfigured": bool(proxy_url),
    "proxyHost": config["proxyHost"] or None,
    "staticIp": static_ip or None,
    "egressIp": config["staticIp"] or None,
    "proxySource": config["source"],
  }


def _serialize_account(acc: TradingAccountModel, auth_message: Optional[str] = None) -> dict:
  data = {
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
  }
  data.update(_proxy_fields(acc))
  if auth_message is not None:
    data["authMessage"] = auth_message
  return data


def _session_for(acc: TradingAccountModel):
  """Return the account session wired to this account's own proxy."""
  api_key = vault.decrypt(acc.encrypted_api_key) if acc.encrypted_api_key else ""
  pin = vault.decrypt(acc.encrypted_pin) if acc.encrypted_pin else ""
  totp_secret = vault.decrypt(acc.encrypted_totp_secret) if acc.encrypted_totp_secret else ""
  return session_manager.get_or_create_session(
    account_id=acc.id,
    client_id=acc.client_id,
    api_key=api_key,
    pin=pin,
    totp_secret=totp_secret,
    proxy_url=_decrypted_proxy_url(acc),
    static_ip=getattr(acc, "static_ip", "") or "",
  )


def _apply_proxy_payload(acc: TradingAccountModel, payload: AccountCreatePayload) -> None:
  """
  Persist per-account proxy settings.

  Destructive only when explicitly requested: a blank proxyUrl keeps the
  stored proxy unless ``clearProxy`` is true, so editing credentials never
  silently drops a working static-IP configuration.
  """
  if payload.clearProxy:
    acc.encrypted_proxy_url = None
    if payload.staticIp is not None:
      acc.static_ip = (payload.staticIp or "").strip()
    return

  if payload.proxyUrl:
    proxy_url = normalize_proxy_url(payload.proxyUrl)
    acc.encrypted_proxy_url = vault.encrypt(proxy_url)
    # Derive the whitelisted IP from the proxy host when it is not supplied
    # separately (TrueIP-style proxies expose the static IP as the host).
    acc.static_ip = (payload.staticIp or "").strip() or static_ip_for(proxy_url)
    return

  if payload.staticIp is not None:
    acc.static_ip = (payload.staticIp or "").strip()


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
      try:
        session = _session_for(acc)
        if session.status == "CONNECTED":
          rms = session.fetch_rms_limits()
          if rms.get("available_margin", 0.0) > 0:
            available_margin = rms["available_margin"]
            used_margin = rms["used_margin"]
            total_capital = rms["total_capital"]
            status = "Connected"
      except Exception as exc:
        logger.warning(
          "Could not refresh live margin for %s: %s", acc.id, redact_secrets(str(exc))
        )

    data = _serialize_account(acc)
    data.update({
      "availableMargin": available_margin,
      "usedMargin": used_margin,
      "totalCapital": total_capital,
      "status": status,
    })
    result.append(data)
  return result


@router.get("/proxy-status")
def get_proxy_status(verify: bool = False):
  """
  Report whether Angel One traffic uses the server-wide static-IP egress proxy.

  Per-account egress is reported by GET /accounts/{account_id}/proxy-status.
  Pass ?verify=true to make a real proxied request and confirm the observed
  egress IP matches ANGEL_STATIC_IP. Never returns proxy credentials.
  """
  status = {
    "source": "server" if settings.angel_proxy_enabled else "direct",
    "enabled": settings.angel_proxy_enabled,
    "staticIp": settings.angel_static_ip or None,
    "proxyHost": settings.angel_proxy_host or None,
  }
  if verify:
    status["egress"] = settings.probe_angel_egress()
  return status


@router.get("/{account_id}/proxy-status")
def get_account_proxy_status(
  account_id: str, verify: bool = False, db: Session = Depends(get_db)
):
  """Report and optionally verify one account's own static-IP egress."""
  acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == account_id).first()
  if not acc:
    raise HTTPException(status_code=404, detail="Account not found")

  config = account_proxy_config(_decrypted_proxy_url(acc), getattr(acc, "static_ip", "") or "")
  status = {
    "accountId": acc.id,
    "source": config["source"],
    "enabled": config["enabled"],
    "staticIp": config["staticIp"] or None,
    "proxyHost": config["proxyHost"] or None,
  }
  if verify:
    status["egress"] = probe_proxy_egress(config["proxies"], config["staticIp"])
  return status


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
    _apply_proxy_payload(existing_acc, payload)
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
    _apply_proxy_payload(new_acc, payload)
    db.add(new_acc)

  db.commit()
  db.refresh(new_acc)

  # Test & initialize session immediately with this account's own proxy.
  session = _session_for(new_acc)

  success, msg = session.authenticate()
  if success:
    rms = session.fetch_rms_limits()
    new_acc.status = "Connected"
    new_acc.available_margin = rms.get("available_margin", 0.0)
    new_acc.used_margin = rms.get("used_margin", 0.0)
    new_acc.total_capital = rms.get("total_capital", 0.0)
    db.commit()
    db.refresh(new_acc)
    return _serialize_account(new_acc, auth_message=msg)

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

  _apply_proxy_payload(acc, payload)

  db.commit()
  db.refresh(acc)

  session = _session_for(acc)

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

  return _serialize_account(acc, auth_message=msg)

@router.post("/{account_id}/test-connection")
def test_broker_connection(account_id: str, db: Session = Depends(get_db)):
  """
  Re-authenticate an Angel One account and report a structured result.

  Broker/auth failures are returned as ``success: false`` with a readable
  message. Infrastructure failures (database, proxy, unexpected exceptions)
  return HTTP 503 with a JSON ``detail`` so the UI can show the real cause
  instead of a generic "Request failed with status code 500".
  """
  try:
    return _test_broker_connection(account_id, db)
  except HTTPException:
    raise
  except Exception as exc:
    message = redact_secrets(f"{type(exc).__name__}: {exc}")
    logger.exception(
      "Unexpected error in test-connection for account %s: %s", account_id, message
    )
    raise HTTPException(
      status_code=503,
      detail=(
        f"Connection test failed: {message[:300]}. "
        f"Check backend logs and /health?db=true."
      ),
    )

def _test_broker_connection(account_id: str, db: Session):
  acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == account_id).first()
  if not acc:
    raise HTTPException(status_code=404, detail="Account not found")

  session = _session_for(acc)
  success, msg = session.authenticate()

  proxy_config = session.proxy_config
  proxy_info = {
    "source": proxy_config["source"],
    "enabled": proxy_config["enabled"],
    "proxyHost": proxy_config["proxyHost"] or None,
    "staticIp": proxy_config["staticIp"] or None,
  }

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
      "lastAuthenticated": session.last_authenticated.isoformat() if session.last_authenticated else "Just now",
      "proxy": proxy_info,
    }
  else:
    acc.status = "Authentication_Required"
    db.commit()
    return {
      "success": False,
      "status": "Authentication_Required",
      "message": msg,
      "proxy": proxy_info,
    }

@router.post("/{account_id}/sync")
def sync_account_margin(account_id: str, db: Session = Depends(get_db)):
  acc = db.query(TradingAccountModel).filter(TradingAccountModel.id == account_id).first()
  if not acc:
    raise HTTPException(status_code=404, detail="Account not found")

  session = _session_for(acc)

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
