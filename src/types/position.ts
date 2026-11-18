import { UnderlyingSymbol } from './algo';

export interface Position {
  id: string;
  accountId: string;
  accountName: string;
  symbol: string;
  underlying: UnderlyingSymbol;
  expiry: string;
  rawExpiry?: string;
  strike: number;
  type: 'CE' | 'PE' | 'FUT' | 'EQ' | string;
  quantity: number; // positive for BUY (Long), negative for SELL (Short)
  side?: 'BUY' | 'SELL';
  productType?: 'CARRYFORWARD' | 'INTRADAY' | string;
  lots?: number;
  lotSize?: number;
  averagePrice: number;
  ltp: number;
  unrealizedPnL: number;
  pnlPercent: number;
  realizedPnL: number;
  algoId: string;
  algoName: string;
  status: 'OPEN' | 'CLOSED';
  entryTime: string;
  symbolToken?: string;
  exchange?: string;
}
