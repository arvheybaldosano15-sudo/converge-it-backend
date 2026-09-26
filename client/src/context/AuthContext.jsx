import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import { getAuthToken, getCachedUser, setAuthSession, clearAuthSession } from '../utils/authStorage';
import { prefetchAdminData, prefetchTechData } from '../utils/prefetch';
import toast from 'react-hot-toast';

// Detects if the app is running as an installed PWA (standalone) vs a regular browser tab
const isPWA = () =>
  typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const cachedUser = getCachedUser();
  const [user, setUser] = useState(() => cachedUser);
  const [loading, setLoading] = useState(() => !cachedUser);

  useEffect(() => {
    const fetchMe = async () => {
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Safety timeout promise — guarantees setLoading(false) completes within 4 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 4000)
      );

      try {
        const res = await Promise.race([api.get('/auth/me'), timeoutPromise]);
        if (res && res.success) {
          setAuthSession(res.data);
          setUser(res.data);
        }
      } catch (err) {
        const httpStatus = err?.status || err?.statusCode;
        const isExplicit401 = httpStatus === 401;

        if (isExplicit401) {
          queryClient.clear();
          clearAuthSession('all');
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
        } else {
          console.warn('Auth check notice (keeping session):', err?.message || err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [queryClient]);

  const login = async (email, password) => {
    queryClient.clear();
    clearAuthSession('all');
    delete api.defaults.headers.common['Authorization'];

    let res;
    try {
      res = await api.post('/auth/login', { email, password }, { timeout: 15000 });
    } catch (err) {
      const httpStatus = err?.status || err?.statusCode;
      const isNetworkDrop = !httpStatus && (err?.message?.includes('timeout') || err?.message?.includes('Network') || err?.message?.includes('network'));
      if (isNetworkDrop) {
        await new Promise((r) => setTimeout(r, 800));
        res = await api.post('/auth/login', { email, password }, { timeout: 15000 });
      } else {
        throw err;
      }
    }
    if (res && res.success) {
      const { user: userData, accessToken, refreshToken } = res.data;
      setAuthSession(userData, accessToken, refreshToken);
      setUser(userData);
      toast.success(`Welcome back, ${userData.fullName}!`);
      if (userData.role === 'admin') prefetchAdminData();
      return userData;
    }
  };

  const pinLogin = async (pin) => {
    queryClient.clear();
    clearAuthSession('all');
    delete api.defaults.headers.common['Authorization'];

    let res;
    try {
      res = await api.post('/auth/pin-login', { pin }, { timeout: 15000 });
    } catch (err) {
      const httpStatus = err?.status || err?.statusCode;
      const isNetworkDrop = !httpStatus && (err?.message?.includes('timeout') || err?.message?.includes('Network') || err?.message?.includes('network'));
      if (isNetworkDrop) {
        await new Promise((r) => setTimeout(r, 800));
        res = await api.post('/auth/pin-login', { pin }, { timeout: 15000 });
      } else {
        throw err;
      }
    }
    if (res && res.success) {
      const { user: userData, accessToken, refreshToken } = res.data;
      setAuthSession(userData, accessToken, refreshToken);
      setUser(userData);
      toast.success(`Welcome back, ${userData.fullName || 'Technician'}!`);
      prefetchTechData();
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
    const isTech = user?.role === 'technician';
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      queryClient.clear();
      clearAuthSession(user?.role || 'all');
      setUser(null);
      toast.success('Logged out successfully');

      // Allow 350ms for toast alert animation to render smoothly before navigating
      setTimeout(() => {
        const target = isTech ? '/technician-login' : '/login';
        window.location.href = target;
      }, 350);
    }
  };

  const updateUserProfile = (updatedData) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedData };
      setAuthSession(updated);
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
