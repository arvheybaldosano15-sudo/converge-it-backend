import { useQuery } from '@tanstack/react-query';
import api from '../utils/axios';

// ─── Query: Fetch Analytics Overview with Zero-Loading Caching ──────────────
export const useAnalyticsOverview = (params = {}) => {
  return useQuery({
    queryKey: ['analytics', 'overview', params],
    queryFn: async () => {
      const res = await api.get('/analytics/overview', { params });
      return res.data || {};
    },
    staleTime: 1000 * 60 * 10,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};

// ─── Query: Fetch Ticket Trend Metrics ──────────────────────────────────────
export const useTicketTrend = (params = {}) => {
  return useQuery({
    queryKey: ['analytics', 'trend', params],
    queryFn: async () => {
      const res = await api.get('/analytics/tickets-trend', { params });
      return res.data || [];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};

// ─── Query: Fetch SLA Performance Metrics ───────────────────────────────────
export const useSlaPerformance = (params = {}) => {
  return useQuery({
    queryKey: ['analytics', 'sla', params],
    queryFn: async () => {
      const res = await api.get('/analytics/sla-performance', { params });
      return res.data || {};
    },
    staleTime: 1000 * 60 * 10,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};
