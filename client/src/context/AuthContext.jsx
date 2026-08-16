import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import { getAuthToken, getCachedUser, setAuthSession, clearAuthSession } from '../utils/authStorage';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(() => {
    // Immediately restore role-scoped cached user
    return getCachedUser();
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.success) {
          setAuthSession(res.data);
          setUser(res.data);
        }
      } catch (err) {
        // Only clear session on confirmed 401 (invalid/expired token)
        if (err?.status === 401 || err?.statusCode === 401) {
          queryClient.clear();
          clearAuthSession();
          setUser(null);
        }
        console.warn('Auth check failed (keeping session):', err?.message || err);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [queryClient]);

  const login = async (email, password) => {
    queryClient.clear();
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      const { user: userData, accessToken, refreshToken } = res.data;
      setAuthSession(userData, accessToken, refreshToken);
      setUser(userData);
      toast.success(`Welcome back, ${userData.fullName}!`);
      return userData;
    }
  };

  const pinLogin = async (pin) => {
    queryClient.clear();
    const res = await api.post('/auth/pin-login', { pin });
    if (res.success) {
      const { user: userData, accessToken, refreshToken } = res.data;
      setAuthSession(userData, accessToken, refreshToken);
      setUser(userData);
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
