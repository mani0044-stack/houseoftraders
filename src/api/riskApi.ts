import axiosClient from './axiosClient';
import { RiskLimit } from '../types/risk';
import { INITIAL_RISK_LIMIT } from '../services/mockData';

export const riskApi = {
  getRiskLimits: async (): Promise<RiskLimit> => {
    try {
      const res = await axiosClient.get<RiskLimit>('/risk');
      return res.data;
    } catch {
      return INITIAL_RISK_LIMIT;
    }
  },

  triggerEmergencyStop: async (): Promise<boolean> => {
    try {
      await axiosClient.post('/risk/emergency-stop');
      return true;
    } catch {
      return true;
    }
  }
};
