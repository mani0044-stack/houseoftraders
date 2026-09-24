export type AlgoStatus = 'Active' | 'Stopped' | 'Paused' | 'Error' | 'Paper';
export type UnderlyingSymbol = 'NIFTY' | 'BANKNIFTY' | 'FINNIFTY' | 'MIDCPNIFTY' | 'SENSEX' | 'BANKEX';
export type TradingMode = 'Paper' | 'Live';
export type ExecutionMode = 'Intraday' | 'Positional';

export type OTMStrike =
  | 'OTM 1' | 'OTM 2' | 'OTM 3' | 'OTM 4' | 'OTM 5'
  | 'OTM 6' | 'OTM 7' | 'OTM 8' | 'OTM 9' | 'OTM 10'
  | 'OTM 11' | 'OTM 12' | 'OTM 13' | 'OTM 14' | 'OTM 15';

export type ITMStrike =
  | 'ITM 1' | 'ITM 2' | 'ITM 3' | 'ITM 4' | 'ITM 5'
  | 'ITM 6' | 'ITM 7' | 'ITM 8' | 'ITM 9' | 'ITM 10'
  | 'ITM 11' | 'ITM 12' | 'ITM 13' | 'ITM 14' | 'ITM 15';

export type StrikeSelection = 'ATM' | OTMStrike | ITMStrike | 'Closest Premium' | 'ATM %' | 'Straddle Width %';

export type OptionType = 'CE' | 'PE' | 'Auto';

export type LegRiskType = 'Points' | 'Percentage' | 'Underlying Points' | 'Underlying Percentage' | 'None';

export type ReEntryType = 'None' | 'Re-Entry Immediate' | 'Re-Entry ASYM' | 'Re-Execute';

export interface LegRiskSettings {
  slType: LegRiskType;
  slValue: number;
  tpType: LegRiskType;
  tpValue: number;
  trailSLType?: 'Points' | 'Percentage';
  trailSLLockAt?: number;
  trailSLTrailBy?: number;
  reEntryType: ReEntryType;
  reEntryCount: number; // 0 to 10
}

export interface OptionLeg {
  id: string;
  action: 'BUY' | 'SELL';
  optionType: 'CE' | 'PE';
  strikeSelection: StrikeSelection;
  targetPremium?: number; // Used if strikeSelection is 'Closest Premium' (e.g. ₹100)
  strikeOffsetPoints?: number;
  lots: number;
  riskSettings?: LegRiskSettings;
}

export interface TimingSettings {
  entryTime: string; // e.g. "09:16", "09:20", "10:00"
  exitTime: string;  // e.g. "15:15", "15:25"
  executionMode: ExecutionMode; // Intraday vs Positional
  positionalExitMode?: 'Hold Till Expiry' | 'DTE Exit' | 'Target Days';
  positionalExitDTE?: number; // e.g. 0 for exit on Expiry Day
  positionalHoldDays?: number; // e.g. 3 days
}

export interface DaysFilterSettings {
  enabledDays: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
  minDTE?: number;
  maxDTE?: number;
}

export interface OverallStrategyRisk {
  overallSLType: 'Amount' | 'Percentage' | 'None';
  overallSLValue: number; // e.g. 5000 (₹) or 5 (%)
  overallTargetType: 'Amount' | 'Percentage' | 'None';
  overallTargetValue: number; // e.g. 10000 (₹) or 10 (%)
  squareOffType: 'Partial Square-Off' | 'Complete Square-Off';
  trailSL?: {
    lockAt: number;
    trailBy: number;
  };
}

export type OptionStrategyType =
  | 'Bull Call Spread'
  | 'Bull Put Spread'
  | 'Bear Call Spread'
  | 'Bear Put Spread'
  | 'Long Straddle'
  | 'Short Straddle'
  | 'Long Strangle'
  | 'Short Strangle'
  | 'Iron Condor'
  | 'Iron Butterfly'
  | 'Custom Multi-Leg';

export interface EntryCondition {
  id: string;
  indicator1: string;
  period1?: number;
  operator: 'Crosses Above' | 'Crosses Below' | '>' | '<' | '==';
  indicator2: string;
  period2?: number;
  value?: number;
  logicalOp?: 'AND' | 'OR';
}

export interface ExitConditions {
  stopLossPercent?: number;
  targetPercent?: number;
  trailingStopLossPercent?: number;
  timeExit?: string; // e.g. "15:15"
  indicatorExit?: string;
}

export interface AccountAllocation {
  accountId: string;
  accountName: string;
  enabled: boolean;
  lotsMultiplier: number;
}

export interface Algorithm {
  id: string;
  name: string;
  description: string;
  underlying: UnderlyingSymbol;
  strategyType: string;
  status: AlgoStatus;
  mode: TradingMode;
  assignedAccounts: string[]; // Account IDs
  accountAllocations: AccountAllocation[];
  tradesToday: number;
  todaysPnL: number;
  maxDailyLoss: number;
  currentExposure: number;
  maxTradesPerDay: number;
  maxOpenPositions: number;
  expiryType: 'Nearest' | 'Next' | 'Specific';
  strikeSelection?: StrikeSelection;
  optionType?: OptionType;
  legs?: OptionLeg[];
  timingSettings?: TimingSettings;
  daysFilter?: DaysFilterSettings;
  overallRisk?: OverallStrategyRisk;
  entryConditions?: EntryCondition[];
  exitConditions: ExitConditions;
  positionSizing: {
    type: 'Fixed Lots' | 'Capital Percent' | 'Risk Percent';
    value: number;
  };
  createdAt: string;
  lastSignalAt?: string;
}


