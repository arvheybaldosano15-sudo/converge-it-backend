import { useQuery } from '@tanstack/react-query';
import api from '../utils/axios';

// ─── Query: Admin Dashboard Metrics & Real-time Caching ──────────────────────
export const useAdminDashboard = () => {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: async () => {
      const res = await api.get('/dashboard/admin');
      return res.data || {};
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh cache
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};

// ─── Query: Technician Dashboard Metrics & Real-time Caching ────────────────
export const useTechDashboard = () => {
  return useQuery({
    queryKey: ['dashboard', 'technician'],
    queryFn: async () => {
      const res = await api.get('/dashboard/technician');
      return res.data || {};
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};
