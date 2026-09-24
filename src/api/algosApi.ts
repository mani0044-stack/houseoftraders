import axiosClient from './axiosClient';
import { Algorithm, AlgoStatus } from '../types/algo';
import { INITIAL_ALGOS } from '../services/mockData';

export const algosApi = {
  getAlgos: async (): Promise<Algorithm[]> => {
    try {
      const res = await axiosClient.get<Algorithm[]>('/algos');
      return res.data;
    } catch {
      return INITIAL_ALGOS;
    }
  },

  createAlgo: async (algo: Omit<Algorithm, 'id' | 'createdAt' | 'tradesToday' | 'todaysPnL' | 'currentExposure'>): Promise<Algorithm> => {
    try {
      const res = await axiosClient.post<Algorithm>('/algos', algo);
      return res.data;
    } catch {
      const created: Algorithm = {
        ...algo,
        id: `algo-${Date.now()}`,
        tradesToday: 0,
        todaysPnL: 0,
        currentExposure: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      return created;
    }
  },

  updateAlgoStatus: async (id: string, status: AlgoStatus): Promise<boolean> => {
    try {
      await axiosClient.post(`/algos/${id}/${status.toLowerCase()}`);
      return true;
    } catch {
      return true;
    }
  },

  executeAlgo: async (id: string): Promise<any> => {
    const res = await axiosClient.post(`/algos/${id}/execute`);
    return res.data;
  }
};

