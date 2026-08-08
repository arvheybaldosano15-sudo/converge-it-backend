import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';

const PrivateRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <Loader text="Verifying credentials..." />;

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
