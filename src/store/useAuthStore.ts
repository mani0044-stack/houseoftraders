import { create } from 'zustand';
import { authApi, UserProfile } from '../api/authApi';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('hot_auth_token');
  } catch {
    return null;
  }
};

const getStoredUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem('hot_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => {
  const initialToken = getStoredToken();
  const initialUser = getStoredUser();

  return {
    token: initialToken,
    user: initialUser,
    isAuthenticated: Boolean(initialToken),
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    login: async (email: string, password: string): Promise<boolean> => {
      set({ isLoading: true, error: null });
      try {
        const res = await authApi.login(email, password);
        const { access_token, user } = res;

        localStorage.setItem('hot_auth_token', access_token);
        localStorage.setItem('hot_auth_user', JSON.stringify(user));

        set({
          token: access_token,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } catch (err: any) {
        const errorDetail =
          err.response?.data?.detail ||
          err.message ||
          'Invalid credentials. Please check your email and password.';
        set({ error: errorDetail, isLoading: false });
        return false;
      }
    },

    logout: () => {
      try {
        authApi.logout();
      } catch {
        // Ignore
      }
      localStorage.removeItem('hot_auth_token');
      localStorage.removeItem('hot_auth_user');
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        error: null,
      });
    },

    checkAuth: async (): Promise<boolean> => {
      const currentToken = get().token;
      if (!currentToken) {
        set({ isAuthenticated: false, user: null });
        return false;
      }
      try {
        const profile = await authApi.getMe();
        localStorage.setItem('hot_auth_user', JSON.stringify(profile));
        set({ user: profile, isAuthenticated: true });
        return true;
      } catch {
        get().logout();
        return false;
      }
    },
  };
});
