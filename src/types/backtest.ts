import {
  UnderlyingSymbol,
  OptionLeg,
  ExecutionMode,
  OverallStrategyRisk,
  DaysFilterSettings,
  TimingSettings
} from './algo';

export interface BacktestParams {
  strategyId?: string;
  strategyName?: string;
  underlying: UnderlyingSymbol;
  startDate: string;
  endDate: string;
  expiryType: 'Nearest' | 'Next';
  startingCapital: number;
  brokeragePerLot: number;
  slippagePercent: number;
  positionSizeLots: number;
  executionMode: ExecutionMode; // 'Intraday' | 'Positional'
  timingSettings: TimingSettings;
  daysFilter: DaysFilterSettings;
  legs: OptionLeg[];
  overallRisk: OverallStrategyRisk;
}

export interface BacktestTradeLeg {
  symbol: string;
  action: 'BUY' | 'SELL';
  optionType: 'CE' | 'PE';
  strike: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  exitReason: string;
}

export interface BacktestTrade {
  id: string;
  entryTime: string;
  exitTime: string;
  underlying: UnderlyingSymbol;
  symbol: string;
  type: 'CE' | 'PE' | 'Multi-Leg Strategy';
  side: 'BUY' | 'SELL' | 'MIXED';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  returnOnCapital: number;
  exitReason: 'Stop Loss' | 'Target Profit' | 'Time Exit' | 'Expiry Exit' | 'Overall SL' | 'Overall Target' | 'Trailing SL';
  executionMode: ExecutionMode;
  dteAtEntry: number;
  holdingTimeMinutes: number;
  legsBreakdown?: BacktestTradeLeg[];
}

export interface EquityCurvePoint {
  date: string;
  equity: number;
  drawdownPercent: number;
}

export interface DayOfWeekStat {
  day: string;
  trades: number;
  winRate: number;
  netPnL: number;
}

export interface MonthlyReturnsYear {
  year: number;
  months: { [key: string]: number }; // e.g. { "Jan": 12500, "Feb": -3200, ... }
  totalPnL: number;
  totalPnLPercent: number;
}

export interface BacktestResult {
  params: BacktestParams;
  netPnL: number;
  netPnLPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  sharpeRatio: number;
  expectancy: number;
  maxWinningStreak: number;
  maxLosingStreak: number;
  averageTradePnL: number;
  avgHoldingTimeMinutes: number;
  equityCurve: EquityCurvePoint[];
  monthlyReturnsMatrix: MonthlyReturnsYear[];
  dayOfWeekStats: DayOfWeekStat[];
  trades: BacktestTrade[];
}

