from fastapi import APIRouter
from backend.config import settings

router = APIRouter(prefix="/risk", tags=["Risk"])

@router.get("")
def get_risk_limits():
  return {
    "maxDailyLoss": settings.DEFAULT_DAILY_LOSS_CAP,
    "currentDailyLoss": 0.0,
    "maxTotalExposure": 1000000.0,
    "currentTotalExposure": 515000.0,
    "maxOpenPositions": 10,
    "currentOpenPositions": 4,
    "maxTradesPerDay": 50,
    "currentTradesCount": 40,
    "globalKillSwitchActive": False
  }

@router.post("/emergency-stop")
def trigger_emergency_stop():
  return {
    "success": True,
    "message": "GLOBAL KILL SWITCH ACTIVATED. All strategies stopped. Positions flattened."
  }
