export interface RiskLimit {
  maxDailyLoss: number;
  currentDailyLoss: number;
  maxTotalExposure: number;
  currentTotalExposure: number;
  maxOpenPositions: number;
  currentOpenPositions: number;
  maxTradesPerDay: number;
  currentTradesCount: number;
  globalKillSwitchActive: boolean;
}

export interface AccountRiskLimit {
  accountId: string;
  accountName: string;
  maxDailyLoss: number;
  currentDailyLoss: number;
  maxExposure: number;
  currentExposure: number;
  isEnabled: boolean;
}
