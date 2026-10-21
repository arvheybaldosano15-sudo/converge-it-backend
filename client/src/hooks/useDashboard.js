import { useQuery } from '@tanstack/react-query';
import api from '../utils/axios';

const ADMIN_DASH_KEY = 'CONVERGE_ADMIN_DASHBOARD_CACHE';
const TECH_DASH_KEY  = 'CONVERGE_TECH_DASHBOARD_CACHE';

const safeSave = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
};

const getStoredData = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (_) {}
  return undefined;
};

// ─── Query: Admin Dashboard Metrics ──────────────────────────────────────────
export const useAdminDashboard = () => {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: async () => {
      const res = await api.get('/dashboard/admin', { params: { fresh: true } });
      const data = res.data || {};
      safeSave(ADMIN_DASH_KEY, data);
      return data;
    },
    initialData: () => getStoredData(ADMIN_DASH_KEY),
    staleTime: 0, // Always stale → refetch immediately in background on mount
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });
};

// ─── Query: Technician Dashboard Metrics ─────────────────────────────────────
export const useTechDashboard = () => {
  return useQuery({
    queryKey: ['dashboard', 'technician'],
    queryFn: async () => {
      const res = await api.get('/dashboard/technician', { params: { fresh: true } });
      const data = res.data || {};
      safeSave(TECH_DASH_KEY, data);
      return data;
    },
    initialData: () => getStoredData(TECH_DASH_KEY),
    staleTime: 0, // Always stale → refetch immediately in background on mount
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });
};
