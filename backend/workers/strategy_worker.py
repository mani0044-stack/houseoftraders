import time
import logging
from typing import Dict, Any, List
from backend.engine.strategy_framework import Signal
from backend.engine.strategies.nifty_momentum import NiftyMomentumStrategy
from backend.engine.risk_engine import RiskEngine


logging.basicConfig(level=logging.INFO, format="%(asctime)s - [StrategyWorker] - %(levelname)s - %(message)s")
logger = logging.getLogger("strategy_worker")

class StrategyWorker:
    """
    Subscribes to live market tick stream and evaluates strategy algorithms.
    Dispatches signals to the Three-Tiered Risk Engine for multi-account fan-out.
    """
    def __init__(self):
        self.running = False
        self.strategies = [
            NiftyMomentumStrategy()
        ]
        self.risk_engine = RiskEngine()

    def start(self):
        self.running = True
        logger.info(f"Starting Strategy Worker with {len(self.strategies)} active strategies...")
        
        tick_count = 0
        while self.running:
            try:
                # Mock tick sequence for strategy evaluation
                tick_count += 1
                sample_tick = {
                    "symbol": "NIFTY",
                    "ltp": 22450.0 + (tick_count % 10) * 2.5,
                    "changePercent": 0.6 if (tick_count % 5 == 0) else 0.1,
                    "high_5m": 22465.0,
                    "low_5m": 22430.0,
                    "rsi_14": 58.5,
                    "vix": 14.2
                }

                for strategy in self.strategies:
                    signal = strategy.on_tick(sample_tick)
                    if signal:
                        logger.info(f"Signal Generated: {signal.action} {signal.option_type} for {signal.underlying} (Strategy: {signal.strategy_id})")
                        # Fan out signal to target accounts with risk checks
                        fanout_results = self.risk_engine.evaluate_signal_fanout(
                            signal=signal,
                            strategy_config={"max_daily_loss": 15000.0, "current_daily_loss": 0.0, "base_lots": 1},
                            account_allocations=[
                                {"account_id": "ACC-MASTER-01", "enabled": True, "lots_multiplier": 2, "available_margin": 250000.0},
                                {"account_id": "ACC-PROP-02", "enabled": True, "lots_multiplier": 1, "available_margin": 100000.0}
                            ],
                            global_risk_state={"global_kill_switch": False, "current_daily_loss": 0.0, "max_daily_loss": 50000.0}
                        )
                        for res in fanout_results:
                            status = f"APPROVED ({res.lots} lots)" if res.approved else f"REJECTED ({res.reason})"
                            logger.info(f"  Account {res.account_id}: {status}")

                time.sleep(3.0)
            except KeyboardInterrupt:
                logger.info("Stopping Strategy Worker...")
                self.running = False
            except Exception as e:
                logger.error(f"Error in Strategy Worker: {e}")
                time.sleep(3.0)

if __name__ == "__main__":
    worker = StrategyWorker()
    worker.start()
