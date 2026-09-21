import axios from 'axios';
import { getAuthToken, getRefreshToken, setAuthSession, clearAuthSession, isTechPath } from './authStorage';

const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  let cleaned = envUrl.trim().replace(/\/+$/, '');
  if (!cleaned.endsWith('/api')) {
    cleaned += '/api';
  }
  return cleaned;
};

const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000, // 15 seconds network timeout to prevent hanging requests on mobile
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    // Automatic quiet retry for 502, 503, 504 server hiccups or temporary connection drops
    const isRetryableStatus = status === 502 || status === 503 || status === 504 || !error.response;
    if (isRetryableStatus && (!originalRequest._retryCount || originalRequest._retryCount < 2)) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      await new Promise((r) => setTimeout(r, 400 * originalRequest._retryCount));
      return api(originalRequest);
    }

    // Don't intercept 401 if it's already a retry or if URL is login/refresh-token
    const isAuthUrl = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh-token');

    if (status === 401 && !originalRequest._retry && !isAuthUrl) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();
      
      if (refreshToken) {
        try {
          const res = await axios.post(`${getApiUrl()}/auth/refresh-token`, { refreshToken });
          if (res.data?.success) {
            const { user: userData, accessToken, refreshToken: newRefresh } = res.data.data;
            setAuthSession(userData, accessToken, newRefresh);
            
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            }
            return api(originalRequest);
          }
        } catch (refreshErr) {
          // Token refresh failed
        }
      }

      // Token invalid / expired — clear current role's session and redirect cleanly
      const isTech = isTechPath();
      clearAuthSession(isTech ? 'technician' : 'admin');

      const currentPath = window.location.pathname;
      if (
        currentPath !== '/login' &&
        currentPath !== '/technician-login' &&
        !currentPath.startsWith('/track') &&
        !currentPath.startsWith('/kb')
      ) {
        if (currentPath.startsWith('/technician')) {
          window.location.href = '/technician-login';
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject({
      ...(typeof error.response?.data === 'object' ? error.response.data : { message: error.message }),
      status: error.response?.status,
      statusCode: error.response?.status,
    });
  }
);

export default api;
