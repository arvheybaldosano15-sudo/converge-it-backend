import { useQuery } from '@tanstack/react-query';
import api from '../utils/axios';

const ADMIN_DASH_KEY = 'CONVERGE_ADMIN_DASHBOARD_CACHE';
const TECH_DASH_KEY  = 'CONVERGE_TECH_DASHBOARD_CACHE';

const safeSave = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
};

// ─── Query: Admin Dashboard Metrics ──────────────────────────────────────────
export const useAdminDashboard = () => {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: async () => {
      const res = await api.get('/dashboard/admin');
      const data = res.data || {};
      safeSave(ADMIN_DASH_KEY, data);
      return data;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    initialData: () => {
      try {
        const cached = localStorage.getItem(ADMIN_DASH_KEY);
        return cached ? JSON.parse(cached) : undefined;
      } catch (_) { return undefined; }
    },
    initialDataUpdatedAt: () => Date.now(), // treat localStorage data as fresh
    placeholderData: (previousData) => previousData,
  });
};

// ─── Query: Technician Dashboard Metrics ─────────────────────────────────────
export const useTechDashboard = () => {
  return useQuery({
    queryKey: ['dashboard', 'technician'],
    queryFn: async () => {
      const res = await api.get('/dashboard/technician');
      const data = res.data || {};
      safeSave(TECH_DASH_KEY, data);
      return data;
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    initialData: () => {
      try {
        const cached = localStorage.getItem(TECH_DASH_KEY);
        return cached ? JSON.parse(cached) : undefined;
      } catch (_) { return undefined; }
    },
    initialDataUpdatedAt: () => Date.now(),
    placeholderData: (previousData) => previousData,
  });
};
