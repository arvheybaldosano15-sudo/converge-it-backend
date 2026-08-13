import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh-token', { refreshToken });
          if (res.data?.success) {
            const { accessToken, refreshToken: newRefresh } = res.data.data;
            localStorage.setItem('token', accessToken);
            localStorage.setItem('refreshToken', newRefresh);
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          // Token refresh failed
        }
      }

      // Token invalid / expired — clear session and redirect cleanly
      localStorage.clear();
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
