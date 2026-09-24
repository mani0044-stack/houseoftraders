import axiosClient from './axiosClient';
import { OptionChainRow } from '../types/options';
import { UnderlyingSymbol } from '../types/algo';
import { generateMockOptionChain } from '../services/optionChainGenerator';

export const optionsApi = {
  getOptionChain: async (underlying: UnderlyingSymbol, expiry?: string, spot?: number): Promise<OptionChainRow[]> => {
    try {
      const res = await axiosClient.get<OptionChainRow[]>('/options/chain', { params: { underlying, expiry, spot } });
      return res.data;
    } catch {
      const activeSpot = spot || (underlying === 'BANKNIFTY' ? 53210.80 : underlying === 'FINNIFTY' ? 23640.25 : 24865.40);
      return generateMockOptionChain(underlying, activeSpot, expiry || '26 SEP 2024');
    }
  }
};

