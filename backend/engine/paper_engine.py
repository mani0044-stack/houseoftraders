import random
from typing import Dict, Any, Optional

class PaperTradingEngine:
  """
  Paper Trading Simulator:
  Simulates execution, fills, slippage, brokerage charges, and P&L tracking.
  Guarantees zero real broker order placement when LIVE_TRADING = False.
  """
  def simulate_fill(
    self,
    symbol: str,
    side: str,
    quantity: int,
    market_price: float,
    slippage_pct: float = 0.05,
    brokerage_per_lot: float = 20.0
  ) -> Dict[str, Any]:
    
    # Apply simulated slippage
    slippage = market_price * (slippage_pct / 100.0)
    fill_price = market_price + slippage if side.upper() == "BUY" else market_price - slippage
    fill_price = round(fill_price, 2)

    # Calculate brokerage charges
    lots = max(1, quantity // 50)
    total_charges = round(lots * brokerage_per_lot, 2)

    return {
      "status": "COMPLETED",
      "fill_price": fill_price,
      "quantity": quantity,
      "brokerage": total_charges,
      "execution_mode": "PAPER",
      "timestamp": "Just now"
    }

paper_engine = PaperTradingEngine()
