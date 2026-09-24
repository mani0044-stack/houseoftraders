import { TradingAccount } from '../types/account';
import { Algorithm } from '../types/algo';
import { MarketQuote, Candle } from '../types/market';
import { OptionChainRow } from '../types/options';
import { Order } from '../types/order';
import { Position } from '../types/position';
import { RiskLimit } from '../types/risk';
import { ActivityLogItem } from '../types/activity';

export const INITIAL_ACCOUNTS: TradingAccount[] = [];

export const INITIAL_ALGOS: Algorithm[] = [];

export const INITIAL_MARKET_QUOTES: Record<string, MarketQuote> = {
  NIFTY: {
    symbol: 'NIFTY',
    ltp: 24865.40,
    change: 142.15,
    changePercent: 0.58,
    open: 24750.00,
    high: 24895.30,
    low: 24710.20,
    prevClose: 24723.25,
    volume: 18450200,
    lastUpdated: '15:29:59 IST'
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    ltp: 53210.80,
    change: 310.50,
    changePercent: 0.59,
    open: 52950.00,
    high: 53340.60,
    low: 52880.10,
    prevClose: 52900.30,
    volume: 12104500,
    lastUpdated: '15:29:59 IST'
  },
  FINNIFTY: {
    symbol: 'FINNIFTY',
    ltp: 23640.25,
    change: -45.80,
    changePercent: -0.19,
    open: 23700.00,
    high: 23725.00,
    low: 23590.00,
    prevClose: 23686.05,
    volume: 6840300,
    lastUpdated: '15:29:59 IST'
  }
};

export const INITIAL_POSITIONS: Position[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_RISK_LIMIT: RiskLimit = {
  maxDailyLoss: 50000,
  currentDailyLoss: 0, // currently net positive +21,500
  maxTotalExposure: 1000000,
  currentTotalExposure: 515000,
  maxOpenPositions: 10,
  currentOpenPositions: 4,
  maxTradesPerDay: 50,
  currentTradesCount: 40,
  globalKillSwitchActive: false,
};

export const INITIAL_ACTIVITY_LOGS: ActivityLogItem[] = [
  {
    id: 'log-1',
    timestamp: '15:29:55 IST',
    category: 'WebSocket',
    severity: 'INFO',
    title: 'Market Feed Heartbeat',
    message: 'WebSocket ticker active. Latency: 12ms.'
  },
  {
    id: 'log-2',
    timestamp: '14:22:05 IST',
    category: 'Order',
    severity: 'SUCCESS',
    title: 'Order Executed',
    message: 'BUY 150 NIFTY24SEP24850CE @ 142.50 executed on Main Angel Alpha.'
  },
  {
    id: 'log-3',
    timestamp: '14:22:04 IST',
    category: 'Risk',
    severity: 'INFO',
    title: 'Risk Check Approved',
    message: 'Order for 150 NIFTY24SEP24850CE passed daily exposure and margin limits.'
  },
  {
    id: 'log-4',
    timestamp: '13:05:40 IST',
    category: 'Order',
    severity: 'ERROR',
    title: 'Order Rejected by Broker',
    message: 'BUY 30 BANKNIFTY24SEP53400CE rejected: RMS Insufficient margin.'
  },
  {
    id: 'log-5',
    timestamp: '10:00:00 IST',
    category: 'Algo',
    severity: 'SUCCESS',
    title: 'Algo Started',
    message: 'NIFTY Momentum Scalper started in LIVE trading mode across 2 accounts.'
  }
];
