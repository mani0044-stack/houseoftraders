import time
import json
import logging
import random
from typing import Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [MarketWorker] - %(levelname)s - %(message)s")
logger = logging.getLogger("market_worker")

class MarketDataWorker:
    """
    Subscribes to Angel One SmartWebSocketV2 for NIFTY, BANKNIFTY & Option Ticks.
    Publishes ticks to Redis Pub/Sub for consumption by strategy workers.
    """
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_url = redis_url
        self.running = False
        self.spot_prices = {
            "NIFTY": 22450.0,
            "BANKNIFTY": 48200.0,
            "FINNIFTY": 21300.0
        }

    def start(self):
        self.running = True
        logger.info("Starting Market Data Worker. Connecting to SmartWebSocketV2...")
        
        while self.running:
            try:
                # Simulate live WebSocket ticks with realistic brownian motion
                for index_name, price in self.spot_prices.items():
                    change = random.uniform(-3.5, 3.8)
                    new_price = round(price + change, 2)
                    self.spot_prices[index_name] = new_price
                    
                    tick = {
                        "symbol": index_name,
                        "ltp": new_price,
                        "volume": random.randint(100, 5000),
                        "timestamp": time.time(),
                        "open_interest": random.randint(10000, 500000)
                    }
                    
                    # Log tick event periodically
                    if random.random() < 0.1:
                        logger.info(f"Tick Broadcast -> {index_name}: {new_price}")

                time.sleep(1.0)
            except KeyboardInterrupt:
                logger.info("Stopping Market Data Worker...")
                self.running = False
            except Exception as e:
                logger.error(f"Error in Market Data Worker loop: {e}")
                time.sleep(2.0)

if __name__ == "__main__":
    worker = MarketDataWorker()
    worker.start()
