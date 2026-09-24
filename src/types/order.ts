export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
export type OrderStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'PENDING';

export interface Order {
  id: string;
  brokerOrderId: string;
  timestamp: string;
  accountId: string;
  accountName: string;
  algoId: string;
  algoName: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  price: number;
  averagePrice?: number;
  status: OrderStatus;
  rejectionReason?: string;
  timeline: {
    signalTime: string;
    riskApprovedTime: string;
    brokerSubmittedTime: string;
    completedTime?: string;
  };
  rawPayload?: Record<string, unknown>;
}
