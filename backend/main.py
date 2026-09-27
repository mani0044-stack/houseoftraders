import os
import asyncio
import json
import logging
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database.session import engine, Base
from backend.api.auth_routes import router as auth_router
from backend.api.account_routes import router as account_router
from backend.api.market_routes import router as market_router
from backend.api.strategy_routes import router as strategy_router
from backend.api.order_routes import router as order_router
from backend.api.position_routes import router as position_router
from backend.api.risk_routes import router as risk_router
from backend.api.backtest_routes import router as backtest_router
from backend.api.ingestor_routes import router as ingestor_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("algotrade")

# Create database tables if not existing
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AlgoTrade Options Algorithmic Trading API",
    description="Multi-account options trading platform for Angel One SmartAPI",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Router Modules
app.include_router(auth_router, prefix="/api/v1")
app.include_router(account_router, prefix="/api/v1")
app.include_router(market_router, prefix="/api/v1")
app.include_router(strategy_router, prefix="/api/v1")
app.include_router(order_router, prefix="/api/v1")
app.include_router(position_router, prefix="/api/v1")
app.include_router(risk_router, prefix="/api/v1")
app.include_router(backtest_router, prefix="/api/v1")
app.include_router(ingestor_router, prefix="/api/v1")


class ConnectionManager:
    """Websocket connection manager for live stream of ticks, orders, and risk alerts."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected: {websocket.client}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket client disconnected")

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

ws_manager = ConnectionManager()

spot_prices = {
    "NIFTY": 24865.40,
    "BANKNIFTY": 53210.80,
    "FINNIFTY": 23640.25
}

async def market_tick_broadcaster():
    """Background task to stream live market ticks to all connected WebSocket clients."""
    import random
    while True:
        try:
            await asyncio.sleep(1.2)
            if ws_manager.active_connections:
                symbols = ["NIFTY", "BANKNIFTY", "FINNIFTY"]
                random_symbol = random.choice(symbols)
                max_delta = 12.0 if random_symbol == "BANKNIFTY" else 5.0
                delta = round((random.random() - 0.49) * max_delta, 2)
                spot_prices[random_symbol] = round(max(100.0, spot_prices[random_symbol] + delta), 2)

                tick_msg = {
                    "type": "market_tick",
                    "symbol": random_symbol,
                    "ltp": spot_prices[random_symbol],
                    "ltpDelta": delta,
                    "timestamp": asyncio.get_event_loop().time()
                }
                await ws_manager.broadcast(tick_msg)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in market tick broadcaster: {e}")

async def continuous_strategy_runner():
    """Background task to continuously evaluate active strategies against real-time market ticks."""
    from backend.database.session import SessionLocal
    from backend.database.models import AlgorithmModel
    from backend.engine.strategy_framework import Signal
    from backend.engine.risk_engine import risk_engine
    from backend.engine.order_router import order_router
    import uuid
    from datetime import datetime

    logger.info("Continuous Strategy Execution Engine started.")

    while True:
        try:
            await asyncio.sleep(5.0)
            db = SessionLocal()
            try:
                active_algos = db.query(AlgorithmModel).filter(AlgorithmModel.status == "Active").all()
                if active_algos:
                    for algo in active_algos:
                        symbol = algo.underlying or "NIFTY"
                        current_price = spot_prices.get(symbol, 24865.40)

                        sig_id = f"sig-{uuid.uuid4().hex[:6]}"
                        signal = Signal(
                            strategy_id=algo.id,
                            underlying=symbol,
                            direction="BULLISH",
                            action="BUY",
                            strike_selection=algo.strike_selection or "ATM",
                            option_type="CE" if algo.option_type == "Auto" else algo.option_type,
                            expiry_selection=algo.expiry_type or "Nearest"
                        )

                        account_id = "acc-main-01"
                        risk_res = risk_engine.evaluate_signal_risk(signal, account_id, lots=1)

                        if risk_res.approved:
                            order_info = order_router.route_approved_risk_execution(signal, risk_res, spot_price=current_price)
                            if order_info:
                                algo.trades_today += 1
                                algo.current_exposure += round(current_price * 0.05, 2)
                                db.commit()

                                exec_msg = {
                                    "type": "algo_execution",
                                    "algo_id": algo.id,
                                    "algo_name": algo.name,
                                    "symbol": symbol,
                                    "status": "EXECUTED",
                                    "order": order_info,
                                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                                }
                                await ws_manager.broadcast(exec_msg)
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in continuous strategy runner: {e}")
            await asyncio.sleep(5.0)

@app.on_event("startup")
async def startup_event():
    if not os.getenv("VERCEL"):
        asyncio.create_task(market_tick_broadcaster())
        asyncio.create_task(continuous_strategy_runner())

@app.get("/")
def root():
    return {
        "status": "online",
        "app": "AlgoTrade Options API",
        "docs_url": "/docs",
        "health_url": "/health"
    }

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "app": "AlgoTrade",
        "live_trading_enabled": settings.LIVE_TRADING,
        "paper_trading_mode": not settings.LIVE_TRADING
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Receive client ping or channel subscriptions
            data = await websocket.receive_text()
            payload = json.loads(data)
            action = payload.get("action")
            
            if action == "ping":
                await websocket.send_json({"type": "pong", "timestamp": payload.get("timestamp")})
            elif action == "subscribe":
                symbols = payload.get("symbols", [])
                await websocket.send_json({
                    "type": "subscribed",
                    "symbols": symbols,
                    "status": "active"
                })
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

