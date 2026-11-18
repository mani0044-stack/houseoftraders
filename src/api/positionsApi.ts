import axiosClient from './axiosClient';
import { Position } from '../types/position';

export interface ExitPositionResponse {
  success: boolean;
  message?: string;
  position_id?: string;
  status?: string;
  details?: any;
}

export interface ExitAllPositionsResponse {
  success: boolean;
  message?: string;
  closedCount?: number;
  failedCount?: number;
  results?: any[];
}

export const positionsApi = {
  getPositions: async (): Promise<Position[]> => {
    try {
      const res = await axiosClient.get<Position[]>('/positions');
      return res.data || [];
    } catch (err) {
      console.error('Failed fetching positions:', err);
      return [];
    }
  },

  exitPosition: async (positionId: string, positionData?: Partial<Position>): Promise<ExitPositionResponse> => {
    try {
      const res = await axiosClient.post<ExitPositionResponse>(`/positions/${encodeURIComponent(positionId)}/exit`, positionData || {});
      return res.data || { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to exit position';
      return { success: false, message: msg };
    }
  },

  exitAllPositions: async (accountId?: string): Promise<ExitAllPositionsResponse> => {
    try {
      const res = await axiosClient.post<ExitAllPositionsResponse>('/positions/exit-all', {
        accountId: accountId && accountId !== 'ALL' ? accountId : undefined,
      });
      return res.data || { success: true, closedCount: 0 };
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to exit all positions';
      return { success: false, message: msg, closedCount: 0 };
    }
  }
};
