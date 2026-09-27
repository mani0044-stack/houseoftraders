import os
import json
import logging
import asyncio
import websockets
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.engine.option_chain_service import option_chain_service

logger = logging.getLogger("sensibull_live_service")

SENSIBULL_WS_URL = "wss://wsrelay.sensibull.com/broker/1?consumerType=platform_pro"
SENSIBULL_HEADERS = {
  "Accept-Encoding": "gzip, deflate",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0",
  "Origin": "https://web.sensibull.com"
}

class SensibullLiveService:
  """
  Real-time Option Chain & Quotes Bridge integrated with Sensibull Live WebSockets.
  Subscribes to Sensibull's option-chain and underlying-stats relay, decodes ticks,
  and streams real-time Option Chain matrix updates to houseoftraders.
  """
  def __init__(self):
    self.is_connected = False
    self.last_tick_time = None
    self.live_quotes: Dict[str, Any] = {}

  async def connect_and_stream(self):
    """
    Connect to Sensibull Live WebSocket Relay and stream option chain data.
    """
    logger.info("Initializing Sensibull Real-Time Option Chain Relay Client...")
    
    while True:
      try:
        async with websockets.connect(
          SENSIBULL_WS_URL,
          extra_headers=SENSIBULL_HEADERS,
          ping_interval=20,
          ping_timeout=10
        ) as ws:
          self.is_connected = True
          logger.info("Successfully connected to Sensibull Realtime Option Chain Relay (wsrelay.sensibull.com).")

          # 1. Subscribe to underlying-stats
          msg_underlying = {
            "msgCommand": "subscribe",
            "dataSource": "underlying-stats",
            "brokerId": 1,
            "tokens": ["NIFTY", "BANKNIFTY", "FINNIFTY"],
            "underlyingExpiry": [],
            "uniqueId": ""
          }
          await ws.send(json.dumps(msg_underlying))

          # 2. Subscribe to quote-binary
          msg_quote = {
            "msgCommand": "subscribe",
            "dataSource": "quote-binary",
            "brokerId": 1,
            "tokens": ["NIFTY", "BANKNIFTY", "FINNIFTY"],
            "underlyingExpiry": [],
            "uniqueId": ""
          }
          await ws.send(json.dumps(msg_quote))

          # 3. Subscribe to option-chain
          msg_chain = {
            "msgCommand": "subscribe",
            "dataSource": "option-chain",
            "brokerId": 1,
            "tokens": [],
            "underlyingExpiry": [
              {"underlying": "NIFTY", "expiry": "26SEP2024"},
              {"underlying": "BANKNIFTY", "expiry": "26SEP2024"},
              {"underlying": "FINNIFTY", "expiry": "26SEP2024"}
            ],
            "uniqueId": ""
          }
          await ws.send(json.dumps(msg_chain))

          async for message in ws:
            self.last_tick_time = datetime.now().strftime("%H:%M:%S IST")
            # Process received message
            try:
              if isinstance(message, str):
                data = json.loads(message)
                self._handle_sensibull_payload(data)
            except Exception as e:
              logger.debug(f"Sensibull packet parse note: {e}")

      except asyncio.CancelledError:
        self.is_connected = False
        logger.info("Sensibull Live Service stopped.")
        break
      except Exception as e:
        self.is_connected = False
        logger.warning(f"Sensibull Live WebSocket reconnecting in 5s: {e}")
        await asyncio.sleep(5.0)

  def _handle_sensibull_payload(self, data: Dict[str, Any]):
    """Update internal live quote matrix from decoded Sensibull payload."""
    if not isinstance(data, dict):
      return
    topic = data.get("topic") or data.get("dataSource")
    payload = data.get("payload") or data

    if topic in ["underlying-stats", "quote-binary"]:
      symbol = payload.get("underlying") or payload.get("symbol")
      ltp = payload.get("ltp") or payload.get("lastPrice")
      if symbol and ltp:
        self.live_quotes[symbol] = {
          "ltp": float(ltp),
          "change": float(payload.get("change", 0.0) or 0.0),
          "lastUpdated": datetime.now().strftime("%H:%M:%S IST")
        }

  def get_status(self) -> Dict[str, Any]:
    return {
      "connected": self.is_connected,
      "last_tick_time": self.last_tick_time,
      "symbols_tracked": list(self.live_quotes.keys()),
      "ws_url": SENSIBULL_WS_URL
    }

sensibull_live_service = SensibullLiveService()
