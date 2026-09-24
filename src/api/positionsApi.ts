import axiosClient from './axiosClient';
import { Position } from '../types/position';

export const positionsApi = {
  getPositions: async (): Promise<Position[]> => {
    try {
      const res = await axiosClient.get<Position[]>('/positions');
      return res.data || [];
    } catch {
      return [];
    }
  },

  exitPosition: async (positionId: string): Promise<boolean> => {
    try {
      await axiosClient.post(`/positions/${positionId}/exit`);
      return true;
    } catch {
      return false;
    }
  },

  exitAllPositions: async (): Promise<boolean> => {
    try {
      await axiosClient.post('/positions/exit-all');
      return true;
    } catch {
      return false;
    }
  }
};

