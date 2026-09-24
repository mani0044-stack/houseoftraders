export interface PerformanceMetric {
  totalPnL: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  totalTrades: number;
  profitFactor: number;
}

export interface AlgoPerformanceSummary {
  algoId: string;
  algoName: string;
  tradesCount: number;
  winRate: number;
  pnl: number;
}

export interface AccountPerformanceSummary {
  accountId: string;
  accountName: string;
  pnl: number;
  roiPercent: number;
}

export interface HourlyPerformance {
  hour: string; // e.g. "09:15 - 10:00"
  pnl: number;
  tradesCount: number;
}
