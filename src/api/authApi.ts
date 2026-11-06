import axiosClient from './axiosClient';

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
  isActive?: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await axiosClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return res.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const res = await axiosClient.post<{ success: boolean; message: string }>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return res.data;
  },

  getMe: async (): Promise<UserProfile> => {
    const res = await axiosClient.get<UserProfile>('/auth/me');
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await axiosClient.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    }
  },
};
