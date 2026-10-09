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
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.message = 'API Request Timed Out (10s limit exceeded). Verify that the FastAPI backend server is running and broker APIs are responding.';
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      error.message = 'Backend Server Unreachable. Please start the FastAPI backend on http://localhost:8000.';
    }
    console.warn('API Call Notice:', error.message);
    return Promise.reject(error);
  }
);

export default axiosClient;
