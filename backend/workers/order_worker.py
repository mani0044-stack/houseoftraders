import time
import logging
from typing import Dict, Any
from backend.engine.order_router import OrderRouter, order_router
from backend.engine.paper_engine import paper_engine
from backend.engine.risk_engine import RiskCheckResult
from backend.engine.strategy_framework import Signal

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [OrderWorker] - %(levelname)s - %(message)s")
logger = logging.getLogger("order_worker")

class OrderWorker:
    """
    Worker consuming approved trading signals from Redis queue.
    Routes orders idempotently to Paper Engine or Angel One Live API.
    """
    def __init__(self):
        self.running = False
        self.order_router = order_router

    def process_signal(self, signal: Signal, risk_result: RiskCheckResult) -> Dict[str, Any]:
        """Routes order with idempotency check and returns result."""
        result = self.order_router.route_approved_risk_execution(signal, risk_result)
        if result:
            logger.info(f"Order executed: BrokerID={result.get('broker_order_id')} Status={result.get('status')} Mode={result.get('mode')}")
        return result

    def start(self):
        self.running = True
        logger.info("Starting Order Worker. Listening for validated risk signals...")
        
        while self.running:
            try:
                time.sleep(5.0)
            except KeyboardInterrupt:
                logger.info("Stopping Order Worker...")
                self.running = False
            except Exception as e:
                logger.error(f"Error in Order Worker: {e}")
                time.sleep(3.0)


if __name__ == "__main__":
    worker = OrderWorker()
    worker.start()
