import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
          // Refresh token also invalid — clear everything and redirect
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      } else {
        // No refresh token available
        localStorage.clear();
        if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/track') && !window.location.pathname.startsWith('/kb')) {
          window.location.href = '/login';
        }
      }
    }
    // For non-401 errors (500, network issues), do NOT clear storage
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
