import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Immediately restore from cache — no flash to login on refresh
    try {
      const cached = localStorage.getItem('user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const setAndCacheUser = (userData) => {
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
    setUser(userData);
  };

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAndCacheUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.success) {
          setAndCacheUser(res.data);
        }
      } catch (err) {
        // Only clear session on confirmed 401 (invalid/expired token)
        // Do NOT clear on 500 server errors or network failures (e.g. server restart)
        if (err?.status === 401 || err?.statusCode === 401) {
          localStorage.clear();
          setUser(null);
        }
        // For all other errors (500, network), keep the cached user alive
        console.warn('Auth check failed (keeping session):', err?.message || err);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      const { user: userData, accessToken, refreshToken } = res.data;
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setAndCacheUser(userData);
      toast.success(`Welcome back, ${userData.fullName}!`);
      return userData;
    }
  };

  const pinLogin = async (pin) => {
    const res = await api.post('/auth/pin-login', { pin });
    if (res.success) {
      const { user: userData, accessToken, refreshToken } = res.data;
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setAndCacheUser(userData);
      toast.success(`Welcome back, ${userData.fullName || 'Technician'}!`);
      return userData;
    }
  };

  const registerTechnician = async (formData) => {
    const res = await api.post('/auth/register-technician', formData);
    if (res.success) {
      toast.success(res.message);
      return res.data;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      localStorage.clear();
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateUserProfile = (updatedData) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        pinLogin,
        registerTechnician,
        logout,
        updateUserProfile,
        isAdmin: user?.role === 'admin',
        isTechnician: user?.role === 'technician',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
