import { useQuery } from '@tanstack/react-query';
import api from '../utils/axios';

// ─── Query: Unified Reports & Analytics Data ─────────────────────────────────
export const useReportsData = (filters = {}) => {
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: async () => {
      const [overRes, trendRes, catRes, techRes, resTimeRes, slaRes] = await Promise.all([
        api.get('/analytics/overview', { params: filters }),
        api.get('/analytics/tickets-trend', { params: filters }),
        api.get('/analytics/category-breakdown', { params: filters }),
        api.get('/analytics/technician-performance', { params: filters }),
        api.get('/analytics/response-times', { params: filters }),
        api.get('/analytics/sla-performance', { params: filters }),
      ]);

      return {
        overview: overRes?.data || {},
        trend: trendRes?.data || [],
        categoryData: catRes?.data || [],
        techPerformance: techRes?.data || [],
        responseTimes: resTimeRes?.data || [],
        slaData: slaRes?.data || {},
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes fresh cache — ZERO loading spinners!
    gcTime: 1000 * 60 * 60 * 24, // 24 hours persistent local storage retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
};
