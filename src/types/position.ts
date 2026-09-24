import { UnderlyingSymbol } from './algo';

export interface Position {
  id: string;
  accountId: string;
  accountName: string;
  symbol: string;
  underlying: UnderlyingSymbol;
  expiry: string;
  strike: number;
  type: 'CE' | 'PE' | 'FUT';
  quantity: number; // positive for BUY, negative for SELL
  averagePrice: number;
  ltp: number;
  unrealizedPnL: number;
  pnlPercent: number;
  realizedPnL: number;
  algoId: string;
  algoName: string;
  status: 'OPEN' | 'CLOSED';
  entryTime: string;
}
