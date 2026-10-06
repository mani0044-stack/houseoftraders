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

export const INITIAL_MARKET_QUOTES: Record<string, MarketQuote> = {};

export const INITIAL_POSITIONS: Position[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_RISK_LIMIT: RiskLimit = {
  maxDailyLoss: 50000,
  currentDailyLoss: 0,
  maxTotalExposure: 1000000,
  currentTotalExposure: 0,
  maxOpenPositions: 10,
  currentOpenPositions: 0,
  maxTradesPerDay: 50,
  currentTradesCount: 0,
  globalKillSwitchActive: false,
};

export const INITIAL_ACTIVITY_LOGS: ActivityLogItem[] = [];

