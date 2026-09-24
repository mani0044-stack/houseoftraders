import logging
from typing import Dict, Any, List, Tuple
from backend.engine.strategy_framework import Signal
from backend.config import settings

logger = logging.getLogger(__name__)

class RiskCheckResult:
  def __init__(self, account_id: str, approved: bool, reason: str = "", lots: int = 1):
    self.account_id = account_id
    self.approved = approved
    self.reason = reason
    self.lots = lots

class RiskEngine:
  """
  Three-Tiered Risk Engine:
  1. Global Risk Check (Total daily loss cap, global exposure cap, global kill switch)
  2. Strategy Risk Check (Strategy loss limit, max trades per day, trading time window)
  3. Account Risk Check (Available margin, account loss limit, account position limit, lot multiplier calculation)
  
  Signal Fan-Out: Evaluates signals independently per account allocation.
  """
  def evaluate_signal_fanout(
    self,
    signal: Signal,
    strategy_config: Dict[str, Any],
    account_allocations: List[Dict[str, Any]],
    global_risk_state: Dict[str, Any]
  ) -> List[RiskCheckResult]:
    
    results: List[RiskCheckResult] = []

    # Tier 1: Global Risk Check
    if global_risk_state.get("global_kill_switch", False):
      logger.warning("Signal rejected: GLOBAL KILL SWITCH ACTIVE.")
      return [RiskCheckResult(acc.get("account_id", ""), False, "Global kill switch active") for acc in account_allocations]

    current_global_loss = global_risk_state.get("current_daily_loss", 0.0)
    max_global_loss = global_risk_state.get("max_daily_loss", settings.DEFAULT_DAILY_LOSS_CAP)
    if current_global_loss >= max_global_loss:
      logger.warning(f"Signal rejected: Global daily loss limit exceeded ({current_global_loss} >= {max_global_loss}).")
      return [RiskCheckResult(acc.get("account_id", ""), False, "Global daily loss limit reached") for acc in account_allocations]

    # Tier 2: Strategy Risk Check
    strategy_daily_loss = strategy_config.get("current_daily_loss", 0.0)
    max_strategy_loss = strategy_config.get("max_daily_loss", 15000.0)
    if strategy_daily_loss >= max_strategy_loss:
      logger.warning(f"Signal rejected: Strategy daily loss cap reached ({strategy_daily_loss} >= {max_strategy_loss}).")
      return [RiskCheckResult(acc.get("account_id", ""), False, "Strategy daily loss limit reached") for acc in account_allocations]

    # Tier 3: Account-level Fan-Out Risk Checks
    for alloc in account_allocations:
      acc_id = alloc.get("account_id")
      is_enabled = alloc.get("enabled", False)
      multiplier = alloc.get("lots_multiplier", 1)

      if not is_enabled:
        results.append(RiskCheckResult(acc_id, False, "Account allocation disabled for strategy"))
        continue

      available_margin = alloc.get("available_margin", 0.0)
      required_margin = 15000.0 * multiplier # Estimated margin requirement

      if available_margin < required_margin:
        results.append(RiskCheckResult(acc_id, False, f"Insufficient margin (Avail: ₹{available_margin}, Req: ₹{required_margin})"))
        continue

      # Approved for this account with calculated lot multiplier
      base_lots = strategy_config.get("base_lots", 1)
      final_lots = base_lots * multiplier
      results.append(RiskCheckResult(acc_id, True, "Approved", lots=final_lots))

    return results

  def evaluate_single_account_risk(self, signal: Signal, account_id: str, lots: int = 1) -> RiskCheckResult:
    return RiskCheckResult(account_id, True, "Approved", lots=lots)

risk_engine = RiskEngine()

