from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database.models import AlgorithmModel, AccountAllocationModel
from backend.database.seed import seed_database

router = APIRouter(prefix="/algos", tags=["Strategies"])

@router.get("")
def get_strategies(db: Session = Depends(get_db)):
  algos = db.query(AlgorithmModel).all()
  if not algos:
    seed_database(db)
    algos = db.query(AlgorithmModel).all()

  result = []
  for algo in algos:
    allocations = db.query(AccountAllocationModel).filter(AccountAllocationModel.algo_id == algo.id).all()
    assigned_accs = [alloc.account_id for alloc in allocations if alloc.is_enabled]

    result.append({
      "id": algo.id,
      "name": algo.name,
      "description": algo.description or "",
      "underlying": algo.underlying,
      "strategyType": algo.strategy_type,
      "status": algo.status,
      "mode": algo.mode,
      "assignedAccounts": assigned_accs,
      "tradesToday": algo.trades_today,
      "todaysPnL": algo.todays_pnl,
      "maxDailyLoss": algo.max_daily_loss,
      "currentExposure": algo.current_exposure,
      "maxTradesPerDay": algo.max_trades_per_day,
      "maxOpenPositions": algo.max_open_positions,
      "expiryType": algo.expiry_type,
      "strikeSelection": algo.strike_selection,
      "optionType": algo.option_type,
      "createdAt": algo.created_at.strftime("%Y-%m-%d") if algo.created_at else "2026-01-01"
    })
  return result

@router.post("")
def create_strategy(payload: Dict[str, Any], db: Session = Depends(get_db)):
  new_id = f"algo-{payload.get('name', 'custom').lower().replace(' ', '-')}"
  
  new_algo = AlgorithmModel(
    id=new_id,
    name=payload.get("name", "Custom Algo"),
    description=payload.get("description", ""),
    underlying=payload.get("underlying", "NIFTY"),
    strategy_type=payload.get("strategyType", "Custom Algorithmic"),
    status="Active",
    mode=payload.get("mode", "Paper"),
    trades_today=0,
    todays_pnl=0.0,
    max_daily_loss=payload.get("maxDailyLoss", 15000.0),
    current_exposure=0.0,
    max_trades_per_day=payload.get("maxTradesPerDay", 10),
    max_open_positions=payload.get("maxOpenPositions", 2),
    expiry_type=payload.get("expiryType", "Nearest"),
    strike_selection=payload.get("strikeSelection", "ATM"),
    option_type=payload.get("optionType", "Auto"),
    entry_conditions=payload.get("entryConditions"),
    exit_conditions=payload.get("exitConditions"),
    position_sizing=payload.get("positionSizing")
  )
  
  db.add(new_algo)
  db.commit()
  db.refresh(new_algo)
  
  return {
    "id": new_algo.id,
    "name": new_algo.name,
    "description": new_algo.description,
    "underlying": new_algo.underlying,
    "strategyType": new_algo.strategy_type,
    "status": new_algo.status,
    "mode": new_algo.mode,
    "assignedAccounts": [],
    "tradesToday": 0,
    "todaysPnL": 0.0,
    "maxDailyLoss": new_algo.max_daily_loss,
    "currentExposure": 0.0,
    "maxTradesPerDay": new_algo.max_trades_per_day,
    "maxOpenPositions": new_algo.max_open_positions,
    "expiryType": new_algo.expiry_type,
    "strikeSelection": new_algo.strike_selection,
    "optionType": new_algo.option_type,
    "createdAt": new_algo.created_at.strftime("%Y-%m-%d") if new_algo.created_at else "2026-01-01"
  }

@router.post("/{strategy_id}/start")
def start_strategy(strategy_id: str, db: Session = Depends(get_db)):
  algo = db.query(AlgorithmModel).filter(AlgorithmModel.id == strategy_id).first()
  if algo:
    algo.status = "Active"
    db.commit()
  return {"success": True, "strategy_id": strategy_id, "status": "Active"}

@router.post("/{strategy_id}/stop")
def stop_strategy(strategy_id: str, db: Session = Depends(get_db)):
  algo = db.query(AlgorithmModel).filter(AlgorithmModel.id == strategy_id).first()
  if algo:
    algo.status = "Stopped"
    db.commit()
  return {"success": True, "strategy_id": strategy_id, "status": "Stopped"}

@router.post("/{strategy_id}/pause")
def pause_strategy(strategy_id: str, db: Session = Depends(get_db)):
  algo = db.query(AlgorithmModel).filter(AlgorithmModel.id == strategy_id).first()
  if algo:
    algo.status = "Paused"
    db.commit()
  return {"success": True, "strategy_id": strategy_id, "status": "Paused"}

@router.post("/{strategy_id}/execute")
def trigger_algo_execution(strategy_id: str, db: Session = Depends(get_db)):
  algo = db.query(AlgorithmModel).filter(AlgorithmModel.id == strategy_id).first()
  if not algo:
    raise HTTPException(status_code=404, detail="Strategy not found")

  allocations = db.query(AccountAllocationModel).filter(AccountAllocationModel.algo_id == algo.id).all()
  account_id = allocations[0].account_id if allocations else "acc-main-01"

  # Create algorithmic signal
  from backend.engine.strategy_framework import Signal
  from backend.engine.risk_engine import risk_engine
  from backend.engine.order_router import order_router
  import uuid

  signal_id = f"sig-{uuid.uuid4().hex[:6]}"
  sig = Signal(
    strategy_id=algo.id,
    underlying=algo.underlying,
    direction="BULLISH",
    action="BUY",
    strike_selection=algo.strike_selection,
    option_type="CE" if algo.option_type == "Auto" else algo.option_type,
    expiry_selection=algo.expiry_type
  )


  risk_res = risk_engine.evaluate_signal_risk(sig, account_id, lots=1)
  order_info = order_router.route_approved_risk_execution(sig, risk_res, spot_price=24865.40)

  if order_info:
    algo.trades_today += 1
    algo.current_exposure += 142.50 * 50
    db.commit()
    return {"success": True, "message": "Algo Signal Executed", "order": order_info}
  else:
    return {"success": False, "message": "Signal blocked by Risk Engine or Idempotency Key"}

@router.delete("/{strategy_id}")
def delete_strategy(strategy_id: str, db: Session = Depends(get_db)):
  algo = db.query(AlgorithmModel).filter(AlgorithmModel.id == strategy_id).first()
  if algo:
    db.delete(algo)
    db.commit()
  return {"success": True, "strategy_id": strategy_id, "message": "Strategy deleted successfully"}



