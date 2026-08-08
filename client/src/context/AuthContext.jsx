import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.success) {
          setUser(res.data);
        }
      } catch (err) {
        // Only clear session on 401 (invalid token), not on server errors or network issues
        if (err?.status === 401 || err?.statusCode === 401) {
          localStorage.clear();
        }
        console.error('Failed to fetch user:', err);
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
      setUser(userData);
      toast.success(`Welcome back, ${userData.fullName}!`);
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
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
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
