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
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post(`${getApiUrl()}/auth/refresh-token`, { refreshToken });
          if (res.data?.success) {
            const { user: userData, accessToken, refreshToken: newRefresh } = res.data.data;
            setAuthSession(userData, accessToken, newRefresh);
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
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
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
