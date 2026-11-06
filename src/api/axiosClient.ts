import axios from 'axios';

const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

const formatBaseUrl = (url: string): string => {
  let cleanUrl = url.trim().replace(/\/+$/, '');
  if (!cleanUrl.startsWith('/') && !cleanUrl.startsWith('http')) {
    cleanUrl = `/${cleanUrl}`;
  }
  if (!cleanUrl.endsWith('/api/v1')) {
    cleanUrl = `${cleanUrl}/api/v1`;
  }
  return cleanUrl.replace(/\/api\/v1\/api\/v1$/, '/api/v1');
};

const baseURL = formatBaseUrl(rawApiUrl);

export const axiosClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer token to all outgoing requests
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hot_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized and not already on the login page, clear token and redirect
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('hot_auth_token');
        localStorage.removeItem('hot_auth_user');
        window.location.href = '/login';
      }
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.message = 'API Request Timed Out. Verify that the FastAPI backend server is running and broker APIs are responding.';
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      error.message = 'Backend Server Unreachable. Please verify the backend API is deployed and reachable.';
    }
    console.warn('API Call Notice:', error.message);
    return Promise.reject(error);
  }
);

export default axiosClient;
