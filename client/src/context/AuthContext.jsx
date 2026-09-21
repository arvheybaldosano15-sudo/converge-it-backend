import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import { getAuthToken, getCachedUser, setAuthSession, clearAuthSession } from '../utils/authStorage';
import { prefetchAdminData, prefetchTechData } from '../utils/prefetch';
import toast from 'react-hot-toast';

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
        const msg = (err?.message || '').toLowerCase();
        const isAuthError =
          httpStatus === 401 ||
          msg.includes('token') ||
          msg.includes('unauthorized') ||
          msg.includes('expired') ||
          msg.includes('no token') ||
          msg.includes('invalid') ||
          msg.includes('timeout');

        if (isAuthError) {
          queryClient.clear();
          clearAuthSession('all');
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
        } else {
          // Keep session — server may be temporarily unavailable (e.g. 5xx / temporary network glitch)
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
    // Instantly wipe any stale tokens from previous session to prevent 401 header interference
    clearAuthSession('all');
    delete api.defaults.headers.common['Authorization'];

    let res;
    try {
      res = await api.post('/auth/login', { email, password }, { timeout: 15000 });
    } catch (err) {
      // Fast retry once if temporary connection drop occurs
      if (!err.response || err.message?.includes('timeout') || err.message?.includes('Network')) {
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
      // Pre-warm all page caches in the background so first navigation is instant
      if (userData.role === 'admin') prefetchAdminData();
      return userData;
    }
  };

  const pinLogin = async (pin) => {
    queryClient.clear();
    // Instantly wipe any stale tokens from previous session to prevent 401 header interference
    clearAuthSession('all');
    delete api.defaults.headers.common['Authorization'];

    let res;
    try {
      res = await api.post('/auth/pin-login', { pin }, { timeout: 15000 });
    } catch (err) {
      // Fast retry once if temporary connection drop occurs
      if (!err.response || err.message?.includes('timeout') || err.message?.includes('Network')) {
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
      // Pre-warm technician dashboard cache
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
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      queryClient.clear();
      clearAuthSession(user?.role);
      setUser(null);
      toast.success('Logged out successfully');
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
