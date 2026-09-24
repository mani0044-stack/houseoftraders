import { UnderlyingSymbol } from './algo';

export interface MarketQuote {
  symbol: UnderlyingSymbol;
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  lastUpdated: string;
}

export interface Candle {
  timestamp: number;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema9?: number;
  ema21?: number;
  vwap?: number;
  rsi?: number;
}

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1H' | '1D';

export interface TechnicalIndicatorState {
  ema9: boolean;
  ema21: boolean;
  vwap: boolean;
  rsi: boolean;
  macd: boolean;
  supertrend: boolean;
}
