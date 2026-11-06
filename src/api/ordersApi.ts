import axiosClient from './axiosClient';
import { Order } from '../types/order';

export interface CreateOrderRequest {
  accountId?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType?: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
  productType?: 'CARRYFORWARD' | 'INTRADAY' | 'DELIVERY' | 'MARGIN';
  price?: number;
  algoId?: string;
  algoName?: string;
}

export interface AccountLotAllocation {
  accountId: string;
  accountName?: string;
  lots: number;
  multiplier?: number;
  availableMargin?: number;
  usedMargin?: number;
}

export interface BasketLegItem {
  id?: string;
  symbol: string;
  expiry?: string;
  strike?: number | null;
  option_type?: 'CE' | 'PE' | 'FUT';
  transaction_type: 'BUY' | 'SELL';
  order_type: 'MARKET' | 'LIMIT';
  product_type?: 'INTRADAY' | 'CARRYFORWARD';
  lots: number;
  price?: number;
  exchange?: 'NFO' | 'BFO';
  tradingsymbol?: string;
  symboltoken?: string;
}

export interface BasketOrderRequest {
  accountId?: string;
  basketName?: string;
  hedge_first?: boolean;
  orders: BasketLegItem[];
  accountAllocations?: AccountLotAllocation[];
}

export interface BasketLegResult {
  original_index: number;
  exec_index?: number;
  accountId?: string;
  accountName?: string;
  order: BasketLegItem;
  status: 'SUCCESS' | 'FAILED' | string;
  order_id?: string;
  message?: string;
  raw?: any;
}

export interface BasketOrderResponse {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  basketName: string;
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  accountCount?: number;
  results: BasketLegResult[];
  timestamp: string;
}

export const ordersApi = {
  getOrders: async (): Promise<Order[]> => {
    try {
      const res = await axiosClient.get<Order[]>('/orders');
      return res.data || [];
    } catch {
      return [];
    }
  },

  createOrder: async (payload: CreateOrderRequest): Promise<any> => {
    const res = await axiosClient.post<any>('/orders', payload, { timeout: 30000 });
    return res.data;
  },

  placeFoOrder: async (payload: any): Promise<any> => {
    const res = await axiosClient.post<any>('/orders/place_fo', payload, { timeout: 30000 });
    return res.data;
  },

  placeBasketOrder: async (payload: BasketOrderRequest): Promise<BasketOrderResponse> => {
    const res = await axiosClient.post<BasketOrderResponse>('/orders/basket', payload, { timeout: 60000 });
    return res.data;
  },

  cancelOrder: async (orderId: string): Promise<boolean> => {
    try {
      await axiosClient.post(`/orders/${orderId}/cancel`);
      return true;
    } catch {
      return false;
    }
  }
};


