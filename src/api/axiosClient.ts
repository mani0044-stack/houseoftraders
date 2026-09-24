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
    // Graceful error handling for missing backend / network timeouts
    console.warn('API Call Notice (Operating in mock fallback mode):', error.message);
    return Promise.reject(error);
  }
);

export default axiosClient;
