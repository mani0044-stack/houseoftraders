import axiosClient from './axiosClient';
import { TradingAccount, AddAccountPayload } from '../types/account';

export const accountsApi = {
  getAccounts: async (): Promise<TradingAccount[]> => {
    try {
      const res = await axiosClient.get<TradingAccount[]>('/accounts');
      return res.data || [];
    } catch (err) {
      return [];
    }
  },

  getAccountById: async (id: string): Promise<TradingAccount | undefined> => {
    try {
      const res = await axiosClient.get<TradingAccount>(`/accounts/${id}`);
      return res.data;
    } catch {
      return undefined;
    }
  },

  addAccount: async (payload: AddAccountPayload): Promise<TradingAccount> => {
    const res = await axiosClient.post<TradingAccount>('/accounts', payload);
    return res.data;
  },

  updateAccountStatus: async (id: string, isEnabled: boolean): Promise<boolean> => {
    try {
      await axiosClient.patch(`/accounts/${id}`, { isEnabled });
      return true;
    } catch {
      return false;
    }
  },

  updateAccountCredentials: async (id: string, payload: AddAccountPayload): Promise<TradingAccount> => {
    const res = await axiosClient.put<TradingAccount>(`/accounts/${id}`, payload);
    return res.data;
  },

  syncAccountMargin: async (id: string): Promise<TradingAccount> => {
    const res = await axiosClient.post<TradingAccount>(`/accounts/${id}/sync`);
    return res.data;
  },

  testConnection: async (id: string): Promise<{ success: boolean; message: string; availableMargin?: number }> => {
    const res = await axiosClient.post(`/accounts/${id}/test-connection`);
    return res.data;
  },

  deleteAccount: async (id: string): Promise<boolean> => {
    try {
      await axiosClient.delete(`/accounts/${id}`);
      return true;
    } catch {
      return false;
    }
  }
};

