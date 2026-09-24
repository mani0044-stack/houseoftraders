import { UnderlyingSymbol } from './algo';

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
}

export interface OptionContract {
  symbol: string; // e.g. "NIFTY24SEP24800CE"
  underlying: UnderlyingSymbol;
  strike: number;
  expiry: string;
  type: 'CE' | 'PE';
  ltp: number;
  change: number;
  changePercent: number;
  bidPrice: number;
  bidQty: number;
  askPrice: number;
  askQty: number;
  volume: number;
  openInterest: number;
  changeOI: number;
  greeks: OptionGreeks;
  isATM?: boolean;
}

export interface OptionChainRow {
  strike: number;
  isATM: boolean;
  ce: OptionContract;
  pe: OptionContract;
}

export interface OptionChainFilter {
  underlying: UnderlyingSymbol;
  expiry: string;
  strikeRange: 'All' | 'Near ATM 5' | 'Near ATM 10' | 'Near ATM 15';
  typeFilter: 'ALL' | 'CE' | 'PE';
}
