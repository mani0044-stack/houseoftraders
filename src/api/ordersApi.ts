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
    const res = await axiosClient.post<any>('/orders', payload);
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


