from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter(prefix="/backtest", tags=["Backtest"])

@router.post("")
def run_backtest(params: Dict[str, Any]):
    starting_cap = params.get("startingCapital", 500000.0)
    underlying = params.get("underlying", "NIFTY")
    execution_mode = params.get("executionMode", "Intraday")
    timing = params.get("timingSettings", {})
    entry_time = timing.get("entryTime", "09:20")
    exit_time = timing.get("exitTime", "15:15")
    legs = params.get("legs", [])

    net_pnl = 54200.0
    net_pnl_pct = round((net_pnl / starting_cap) * 100, 2)

    equity_curve = []
    current = starting_cap
    max_equity = starting_cap
    max_dd = 0.0

    for day in range(1, 31):
        step = (net_pnl / 30.0) + ((day % 4 - 1.5) * 600)
        current += step
        if current > max_equity:
            max_equity = current
        dd = max_equity - current
        if dd > max_dd:
            max_dd = dd
        equity_curve.append({
            "date": f"2026-09-{day:02d}",
            "equity": round(current, 2),
            "drawdownPercent": round((dd / max_equity) * 100, 2) if max_equity > 0 else 0.0
        })

    mock_trades = [
        {
            "id": "bt-1",
            "entryTime": f"2026-09-01 {entry_time}",
            "exitTime": f"2026-09-01 {exit_time}",
            "underlying": underlying,
            "symbol": f"{underlying} Short Straddle (ATM CE + PE)",
            "type": "Multi-Leg Strategy",
            "side": "SELL",
            "entryPrice": 240.50,
            "exitPrice": 195.20,
            "quantity": 50,
            "pnl": 2265.0,
            "pnlPercent": 0.45,
            "returnOnCapital": 0.45,
            "exitReason": "Time Exit",
            "executionMode": execution_mode,
            "dteAtEntry": 0,
            "holdingTimeMinutes": 355,
            "legsBreakdown": [
                {"symbol": f"{underlying} ATM CE", "action": "SELL", "optionType": "CE", "strike": 24850, "entryPrice": 120.25, "exitPrice": 98.10, "pnl": 1107.50, "exitReason": "Time Exit"},
                {"symbol": f"{underlying} ATM PE", "action": "SELL", "optionType": "PE", "strike": 24850, "entryPrice": 120.25, "exitPrice": 97.10, "pnl": 1157.50, "exitReason": "Time Exit"}
            ]
        },
        {
            "id": "bt-2",
            "entryTime": f"2026-09-02 {entry_time}",
            "exitTime": f"2026-09-02 {exit_time}",
            "underlying": underlying,
            "symbol": f"{underlying} Short Straddle (ATM CE + PE)",
            "type": "Multi-Leg Strategy",
            "side": "SELL",
            "entryPrice": 235.00,
            "exitPrice": 268.00,
            "quantity": 50,
            "pnl": -1650.0,
            "pnlPercent": -0.33,
            "returnOnCapital": -0.33,
            "exitReason": "Stop Loss",
            "executionMode": execution_mode,
            "dteAtEntry": 0,
            "holdingTimeMinutes": 180,
            "legsBreakdown": [
                {"symbol": f"{underlying} ATM CE", "action": "SELL", "optionType": "CE", "strike": 24850, "entryPrice": 117.50, "exitPrice": 165.00, "pnl": -2375.0, "exitReason": "Stop Loss"},
                {"symbol": f"{underlying} ATM PE", "action": "SELL", "optionType": "PE", "strike": 24850, "entryPrice": 117.50, "exitPrice": 103.00, "pnl": 725.0, "exitReason": "Time Exit"}
            ]
        }
    ]

    monthly_returns_matrix = [
        {
            "year": 2026,
            "months": {
                "Jan": 9500, "Feb": -2400, "Mar": 11200, "Apr": 8400,
                "May": 6200, "Jun": 7100, "Jul": 4500, "Aug": 6800, "Sep": 2900
            },
            "totalPnL": net_pnl,
            "totalPnLPercent": net_pnl_pct
        }
    ]

    day_of_week_stats = [
        {"day": "Mon", "trades": 8, "winRate": 62.5, "netPnL": 11200},
        {"day": "Tue", "trades": 9, "winRate": 66.7, "netPnL": 14500},
        {"day": "Wed", "trades": 8, "winRate": 50.0, "netPnL": 4200},
        {"day": "Thu", "trades": 10, "winRate": 70.0, "netPnL": 18400},
        {"day": "Fri", "trades": 7, "winRate": 57.1, "netPnL": 5900}
    ]

    return {
        "params": params,
        "netPnL": net_pnl,
        "netPnLPercent": net_pnl_pct,
        "totalTrades": 42,
        "winningTrades": 27,
        "losingTrades": 15,
        "winRate": 64.3,
        "maxDrawdown": round(max_dd, 2),
        "maxDrawdownPercent": round((max_dd / max_equity) * 100, 2) if max_equity > 0 else 0.0,
        "profitFactor": 2.25,
        "sharpeRatio": 1.94,
        "expectancy": 1290.47,
        "maxWinningStreak": 6,
        "maxLosingStreak": 2,
        "averageTradePnL": round(net_pnl / 42.0, 2),
        "avgHoldingTimeMinutes": 355 if execution_mode == "Intraday" else 1440,
        "equityCurve": equity_curve,
        "monthlyReturnsMatrix": monthly_returns_matrix,
        "dayOfWeekStats": day_of_week_stats,
        "trades": mock_trades
    }

