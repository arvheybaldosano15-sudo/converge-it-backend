import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';

const isPWA = () =>
  typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );

const PrivateRoute = () => {
  const { user, loading } = useAuth();

  if (loading && !user) return <Loader text="Verifying credentials..." />;

  return user ? <Outlet /> : <Navigate to={isPWA() ? '/login' : '/'} replace />;
};

export default PrivateRoute;
