"""
Angel One SmartAPI Market Data Engine & Live WebSocket Streaming Module
-----------------------------------------------------------------------
Author: Quant Developer & Financial Data Engineer
Description: Production-ready module for historical OHLCV data fetching and
             asynchronous multi-threaded live tick streaming via SmartWebSocketV2.
"""

import os
import json
import logging
import datetime
import threading
import queue
import time
import pandas as pd
from typing import Dict, Any, List, Optional, Callable, Tuple, Union

# Import SmartWebSocketV2 from Angel One official package
from SmartApi.smartWebSocketV2 import SmartWebSocketV2

logger = logging.getLogger(__name__)

# =====================================================================
# Module 1: Historical Data Engine (getCandleData)
# =====================================================================

def fetch_historical_data(
    smart_connect_instance: Any,
    ui_payload: Dict[str, Any]
) -> pd.DataFrame:
    """
    Fetches historical OHLCV candle data from Angel One SmartAPI and converts
    the response into a clean, structured pandas DataFrame.

    Parameters:
        smart_connect_instance: Active authenticated SmartConnect instance object.
        ui_payload (dict): UI input payload containing:
            - exchange (str): e.g., "NFO", "NSE", "BSE", "MCX"
            - symboltoken (str): Numerical string token ID e.g. "44442"
            - interval (str): e.g., "ONE_MINUTE", "FIVE_MINUTE", "FIFTEEN_MINUTE", "THIRTY_MINUTE", "ONE_HOUR", "ONE_DAY"
            - fromdate (str/datetime): e.g., "YYYY-MM-DD HH:MM" or "YYYY-MM-DD 09:15"
            - todate (str/datetime): e.g., "YYYY-MM-DD HH:MM" or "YYYY-MM-DD 15:30"

    Returns:
        pd.DataFrame: Structured pandas DataFrame with columns:
                      ['Timestamp', 'Open', 'High', 'Low', 'Close', 'Volume']
    """
    try:
        if not smart_connect_instance:
            raise ValueError("SmartConnect instance is missing or not authenticated.")

        exchange = str(ui_payload.get("exchange", "NSE")).upper()
        symboltoken = str(ui_payload.get("symboltoken", "")).strip()
        interval = str(ui_payload.get("interval", "ONE_MINUTE")).upper()

        if not symboltoken:
            raise ValueError("Parameter 'symboltoken' is required for fetching candle data.")

        # Helper to convert various input date types to Angel One string format: "YYYY-MM-DD HH:MM"
        def format_candle_datetime(date_val: Any, default_time: str = "09:15") -> str:
            if not date_val:
                return ""
            if isinstance(date_val, (datetime.date, datetime.datetime)):
                return date_val.strftime("%Y-%m-%d %H:%M")

            d_str = str(date_val).strip()
            # Handle standard YYYY-MM-DD date-only inputs
            if len(d_str) == 10 and "-" in d_str:
                return f"{d_str} {default_time}"
            # Handle ISO string format (e.g. 2026-10-08T09:15:00)
            if "T" in d_str:
                parts = d_str.split("T")
                time_part = parts[1][:5] if len(parts) > 1 else default_time
                return f"{parts[0]} {time_part}"
            return d_str

        from_date_str = format_candle_datetime(ui_payload.get("fromdate", ""), default_time="09:15")
        to_date_str = format_candle_datetime(ui_payload.get("todate", ""), default_time="15:30")

        if not from_date_str or not to_date_str:
            raise ValueError("Both 'fromdate' and 'todate' are mandatory parameters.")

        historic_params = {
            "exchange": exchange,
            "symboltoken": symboltoken,
            "interval": interval,
            "fromdate": from_date_str,
            "todate": to_date_str
        }

        logger.info(f"Fetching historical candles from SmartAPI: {historic_params}")
        response = smart_connect_instance.getCandleData(historic_params)

        if not response or not isinstance(response, dict):
            raise ConnectionError("No response or invalid response format received from SmartAPI getCandleData.")

        if response.get("status") is not True:
            err_msg = response.get("message", "Historical candle API request failed.")
            err_code = response.get("errorcode", "UNKNOWN")
            raise RuntimeError(f"Angel One SmartAPI Error: {err_msg} (Error Code: {err_code})")

        raw_candles = response.get("data", [])
        if not raw_candles:
            logger.warning(
                f"No candle data returned for token '{symboltoken}' ({exchange}) "
                f"between {from_date_str} and {to_date_str}."
            )
            return pd.DataFrame(columns=['Timestamp', 'Open', 'High', 'Low', 'Close', 'Volume'])

        # Convert raw nested list [[Timestamp, O, H, L, C, V], ...] to pandas DataFrame
        df = pd.DataFrame(raw_candles, columns=['Timestamp', 'Open', 'High', 'Low', 'Close', 'Volume'])

        # Explicit Data Type Validation & Conversion
        df['Timestamp'] = pd.to_datetime(df['Timestamp'])
        df['Open'] = pd.to_numeric(df['Open'], errors='coerce').astype('float64')
        df['High'] = pd.to_numeric(df['High'], errors='coerce').astype('float64')
        df['Low'] = pd.to_numeric(df['Low'], errors='coerce').astype('float64')
        df['Close'] = pd.to_numeric(df['Close'], errors='coerce').astype('float64')
        df['Volume'] = pd.to_numeric(df['Volume'], errors='coerce').fillna(0).astype('int64')

        # Chronological sort and clean index
        df = df.sort_values(by='Timestamp').reset_index(drop=True)

        logger.info(f"Successfully retrieved and parsed {len(df)} candles for token '{symboltoken}'.")
        return df

    except Exception as e:
        logger.error(f"Failed to fetch historical data for payload {ui_payload}: {e}")
        raise e


# =====================================================================
# Module 2: Live Market Feed Streaming (SmartWebSocketV2)
# =====================================================================

EXCHANGE_ENUM_MAP = {
    "NSE": SmartWebSocketV2.NSE_CM,
    "NSE_CM": SmartWebSocketV2.NSE_CM,
    "NFO": SmartWebSocketV2.NSE_FO,
    "NSE_FO": SmartWebSocketV2.NSE_FO,
    "BSE": SmartWebSocketV2.BSE_CM,
    "BSE_CM": SmartWebSocketV2.BSE_CM,
    "BFO": SmartWebSocketV2.BSE_FO,
    "BSE_FO": SmartWebSocketV2.BSE_FO,
    "MCX": SmartWebSocketV2.MCX_FO,
    "MCX_FO": SmartWebSocketV2.MCX_FO,
    "NCX": SmartWebSocketV2.NCX_FO,
    "CDE": SmartWebSocketV2.CDE_FO
}


class AngelLiveMarketFeedManager:
    """
    Asynchronous, multi-threaded Live Market Data Manager utilizing SmartWebSocketV2.
    Runs WebSocket feed in a dedicated background thread to prevent UI freezing.
    """

    def __init__(
        self,
        api_key: str,
        client_code: str,
        jwt_token: str,
        feed_token: str,
        on_tick_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ):
        self.api_key = api_key
        self.client_code = client_code
        self.jwt_token = jwt_token
        self.feed_token = feed_token
        self.on_tick_callback = on_tick_callback

        self.ws_client: Optional[SmartWebSocketV2] = None
        self.is_connected = False
        self.is_running = False
        self._thread: Optional[threading.Thread] = None

        # Thread-safe Queue for UI consumption
        self.tick_queue = queue.Queue(maxsize=20000)

        # Active subscriptions: Dict[exchange_enum, Set[token_str]]
        self._subscriptions: Dict[int, set] = {}

    def _init_ws_client(self):
        """Instantiates SmartWebSocketV2 and registers event handlers."""
        self.ws_client = SmartWebSocketV2(
            auth_token=self.jwt_token,
            api_key=self.api_key,
            client_code=self.client_code,
            feed_token=self.feed_token,
            max_retry_attempt=15,
            retry_strategy=1,
            retry_delay=5
        )

        # Register Callback Handlers
        self.ws_client.on_open = self._on_open
        self.ws_client.on_data = self._on_data
        self.ws_client.on_error = self._on_error
        self.ws_client.on_close = self._on_close

    def _on_open(self, ws):
        """Callback: Fired upon successful WebSocket connection handshake."""
        logger.info("Angel One SmartWebSocketV2 connection opened successfully.")
        self.is_connected = True
        self._resubscribe_all()

    def _on_data(self, ws, message):
        """
        Callback: Parses raw binary/JSON tick stream.
        Extracts Last Traded Price (LTP), Volume, Open Interest (OI), and Market Depth.
        """
        try:
            if not isinstance(message, dict):
                return

            token = message.get("token")
            exchange_type = message.get("exchange_type")

            # Extract prices (Angel One sends values scaled in paise; divide by 100.0)
            ltp = float(message.get("last_traded_price", 0) or 0) / 100.0
            open_price = float(message.get("open_price_of_the_day", 0) or 0) / 100.0
            high_price = float(message.get("high_price_of_the_day", 0) or 0) / 100.0
            low_price = float(message.get("low_price_of_the_day", 0) or 0) / 100.0
            close_price = float(message.get("closed_price", 0) or 0) / 100.0

            volume = int(message.get("volume_trade_for_the_day", 0) or 0)
            open_interest = int(message.get("open_interest", 0) or 0)
            oi_change_pct = float(message.get("open_interest_change_percentage", 0) or 0) / 100.0

            parsed_tick = {
                "token": token,
                "exchange_type": exchange_type,
                "ltp": round(ltp, 2),
                "open": round(open_price, 2),
                "high": round(high_price, 2),
                "low": round(low_price, 2),
                "close": round(close_price, 2),
                "volume": volume,
                "open_interest": open_interest,
                "oi_change_pct": round(oi_change_pct, 2),
                "best_5_buy": message.get("best_5_buy_data", []),
                "best_5_sell": message.get("best_5_sell_data", []),
                "timestamp": datetime.datetime.now().isoformat()
            }

            # Push tick to thread-safe queue for UI consumption
            try:
                self.tick_queue.put_nowait(parsed_tick)
            except queue.Full:
                self.tick_queue.get_nowait()
                self.tick_queue.put_nowait(parsed_tick)

            # Invoke custom UI tick callback if registered
            if self.on_tick_callback:
                self.on_tick_callback(parsed_tick)

        except Exception as e:
            logger.error(f"Error parsing market tick message: {e}")

    def _on_error(self, ws, error):
        """Callback: Handles network or WebSocket disconnect errors."""
        logger.error(f"Angel One SmartWebSocketV2 Error: {error}")

    def _on_close(self, ws, close_code, close_reason):
        """Callback: Triggered on connection close. Handles automatic reconnection state."""
        logger.warning(f"Angel One WebSocket disconnected (Code: {close_code}, Reason: {close_reason}).")
        self.is_connected = False

    def subscribe_tokens(
        self,
        subscriptions: List[Dict[str, Any]],
        mode: int = SmartWebSocketV2.SNAP_QUOTE
    ):
        """
        Dynamically subscribes to a list of F&O / Equity tokens.

        Parameters:
            subscriptions (list): List of dictionaries, e.g.:
                [
                    {"exchange": "NFO", "tokens": ["44442", "40638", "48704"]},
                    {"exchange": "NSE", "tokens": ["35001"]}
                ]
            mode (int): Subscription mode (default SmartWebSocketV2.SNAP_QUOTE = 3)
        """
        if not subscriptions:
            return

        token_payload = []
        for sub in subscriptions:
            exch_str = str(sub.get("exchange", "NFO")).upper()
            exch_enum = EXCHANGE_ENUM_MAP.get(exch_str, SmartWebSocketV2.NSE_FO)
            tokens = [str(t).strip() for t in sub.get("tokens", []) if str(t).strip()]

            if tokens:
                if exch_enum not in self._subscriptions:
                    self._subscriptions[exch_enum] = set()
                self._subscriptions[exch_enum].update(tokens)

                token_payload.append({
                    "exchangeType": exch_enum,
                    "tokens": tokens
                })

        if self.is_connected and self.ws_client and token_payload:
            correlation_id = f"sub_{int(time.time())}"
            logger.info(f"Subscribing to tokens in mode SNAP_QUOTE: {token_payload}")
            self.ws_client.subscribe(correlation_id, mode, token_payload)

    def _resubscribe_all(self):
        """Re-subscribes all active tokens upon reconnecting."""
        if not self._subscriptions or not self.ws_client:
            return

        token_payload = []
        for exch_enum, token_set in self._subscriptions.items():
            if token_set:
                token_payload.append({
                    "exchangeType": exch_enum,
                    "tokens": list(token_set)
                })

        if token_payload:
            logger.info(f"Auto-resubscribing {len(token_payload)} token groups after reconnect...")
            self.ws_client.subscribe(f"resub_{int(time.time())}", SmartWebSocketV2.SNAP_QUOTE, token_payload)

    def start(self):
        """Launches the WebSocket client in a non-blocking background thread."""
        if self.is_running:
            logger.warning("WebSocket manager background thread is already running.")
            return

        self.is_running = True
        self._init_ws_client()

        def run_thread():
            logger.info("Starting background WebSocket client connection loop...")
            try:
                self.ws_client.connect()
            except Exception as e:
                logger.error(f"WebSocket client connection exception: {e}")
            finally:
                self.is_running = False
                self.is_connected = False

        self._thread = threading.Thread(target=run_thread, daemon=True, name="AngelWebSocketWorker")
        self._thread.start()
        logger.info("WebSocket background thread successfully launched.")

    def stop(self):
        """Gracefully disconnects and stops the WebSocket client worker."""
        logger.info("Stopping WebSocket market feed manager...")
        self.is_running = False
        if self.ws_client:
            try:
                self.ws_client.close_connection()
            except Exception as e:
                logger.warning(f"Error closing WebSocket connection: {e}")
        self.is_connected = False
