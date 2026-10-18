import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';

const RoleRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loader text="Checking authorization..." />;

  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    // Gracefully guide users with a valid session to their respective portal
    if (user.role === 'technician') {
      toast.error('Access restricted: Only administrators can access the Admin Portal.', {
        id: 'role-guard-tech',
      });
      return <Navigate to="/technician/dashboard" replace />;
    }
    if (user.role === 'admin') {
      toast.error('Access restricted: Only field technicians can access the Technician Portal.', {
        id: 'role-guard-admin',
      });
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;

