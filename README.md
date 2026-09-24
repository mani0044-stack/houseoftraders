# AlgoTrade - Production-Quality Multi-Account Options Algorithmic Trading Platform Frontend

**AlgoTrade** is a high-density, production-quality React + TypeScript frontend designed for personal and multi-account algorithmic options trading. It connects seamlessly to backend API services (e.g. FastAPI / Python WebSocket) that manage multiple Angel One trading accounts, strategy execution engines, real-time market feeds, option chains, risk limits, paper trading, and backtesting.

---

## 🚀 Key Features

* **Financial Trading Terminal Aesthetics**: Modern dark-first theme (`#0B0F17` background, emerald `#10B981` profit green, rose `#EF4444` loss red, amber `#F59E0B` warnings, high information density).
* **Multi-Account Angel One Broker Support**: Complete account management with masked Client IDs (`ANGEL-****89`), available margin, today's P&L, positions count, enable/disable toggles, and zero frontend credential exposure.
* **15 Complete Dedicated Navigation Pages**:
  1. **Dashboard**: 8 KPI cards, intraday & cumulative Recharts P&L curve, active algorithms table, account overview, recent orders, live system alerts.
  2. **Live Market**: Real-time ticker cards (NIFTY 50, BANKNIFTY, FINNIFTY), interactive candlestick chart, timeframes (1m to 1D), and technical indicators (EMA 9/21, VWAP, RSI subchart).
  3. **Option Chain**: Two-sided Call/Put matrix centered on ATM strike, IV, OI, Change OI, Volume, LTP, Bid/Ask, and right Information Drawer with Option Greeks (Delta, Gamma, Theta, Vega) & order execution buttons.
  4. **Algo Manager**: Algorithm cards (NIFTY Momentum, BANKNIFTY Breakout, Options Scalper, VWAP Strategy), real-time P&L, exposure progress, start/stop/pause/resume/edit/duplicate/logs with safety alerts.
  5. **Create Algo (Visual Strategy Builder)**: Multi-step strategy builder with strike selection (ATM/ITM/OTM), visual condition rule tree builder (EMA, RSI, VWAP, Price), exit rules (SL %, Target %, Trailing SL %, Time exit), position sizing, multi-account allocation matrix with quantity multipliers per account, risk caps, and paper/live launch triggers.
  6. **Accounts**: Card grid & detail drawers for broker accounts with configuration status ("Configured"/"Not configured").
  7. **Positions**: Real-time open positions table, P&L %, single position exit modal, and prominent **"EXIT ALL POSITIONS"** bulk safety action.
  8. **Orders**: Open, Completed, Cancelled, Rejected tabs, order timeline audit drawer (Signal -> Risk Check -> Broker Sent -> Filled).
  9. **Trade History**: Searchable and filterable historical trade execution ledger with charges and CSV export.
  10. **Risk Manager**: Global daily loss, total exposure, open positions progress bars, account & algo kill switches, and Big Red **"EMERGENCY STOP ALL TRADING"** kill switch.
  11. **Paper Trading Sandbox**: Virtual capital (₹10,00,000), virtual P&L, win rate, paper open positions, and instant paper/live mode switcher with vivid safety warnings.
  12. **Backtesting Engine**: Input parameter form, net P&L, win rate, max drawdown, Sharpe ratio, equity curve chart, and simulated trade list.
  13. **Analytics**: Portfolio diagnostics, daily P&L breakdown, win/loss pie chart, hourly breakdown, and disclaimer notice.
  14. **Activity Logs**: Real-time system log stream with severity badges (INFO, SUCCESS, WARNING, ERROR) and category filtering.
  15. **Settings**: FastAPI REST API URL, WebSocket ticker URL, default risk caps, audio alerts, and security preferences.
* **Trading Safety & Security UX**:
  * **Paper Trading by default**.
  * Switching to **LIVE TRADING** requires explicit modal confirmation.
  * Big Red **EMERGENCY STOP ALL** requires double confirmation before stopping algos & sending emergency kill request.
  * **Zero secret leakage**: API keys, TOTP secrets, PINs are never stored in localStorage or rendered in plaintext.

---

## 🛠 Tech Stack

* **Core**: React 18 + TypeScript + Vite
* **Styling**: Tailwind CSS + Custom Dark Financial Terminal Palette
* **Icons**: Lucide React
* **Router**: React Router v6
* **Server State**: TanStack Query (React Query)
* **Global UI / Trading State**: Zustand
* **Charting**: Recharts
* **API & Real-time**: Axios + Custom WebSocket Client with Mock Tick Fallback

---

## 📦 Installation & Setup

1. **Clone or Open Project Directory**:
   ```bash
   cd d:\houseoftrader
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:3000` (or `http://localhost:5173`).

---

## 🔌 Connecting to Backend API (FastAPI / Python)

The frontend is designed to work standalone out of the box with realistic mock data and simulated WebSocket tick streams.

To connect to a live FastAPI backend:

1. Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_WS_URL=ws://localhost:8000/ws
   ```
2. Restart the Vite dev server (`npm run dev`).
