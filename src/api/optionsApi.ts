import axiosClient from './axiosClient';
import { OptionChainRow } from '../types/options';
import { UnderlyingSymbol } from '../types/algo';
import { generateMockOptionChain } from '../services/optionChainGenerator';

export const optionsApi = {
  getExpiries: async (underlying: UnderlyingSymbol): Promise<string[]> => {
    try {
      const res = await axiosClient.get<string[]>('/options/expiries', { params: { underlying } });
      return res.data;
    } catch {
      return ['26 SEP 2024', '03 OCT 2024', '31 OCT 2024'];
    }
  },

  getOptionChain: async (underlying: UnderlyingSymbol, expiry?: string, spot?: number, strikes_range: number = 10): Promise<OptionChainRow[]> => {
    try {
      const res = await axiosClient.get<OptionChainRow[]>('/options/chain', { params: { underlying, expiry, spot, strikes_range } });
      return res.data;
    } catch {
      const activeSpot = spot || (underlying === 'BANKNIFTY' ? 53210.80 : underlying === 'FINNIFTY' ? 23640.25 : 24865.40);
      return generateMockOptionChain(underlying, activeSpot, expiry || '26 SEP 2024');
    }
  }
};
