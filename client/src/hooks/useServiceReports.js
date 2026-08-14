import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import toast from 'react-hot-toast';

// ─── Query: Fetch Service Reports with Cache Validation ────────────────────
export const useServiceReports = (params = {}) => {
  return useQuery({
    queryKey: ['serviceReports', params],
    queryFn: async () => {
      const res = await api.get('/service-reports', { params });
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh cache
  });
};

// ─── Query: Fetch Single Service Report ─────────────────────────────────────
export const useServiceReport = (reportId) => {
  return useQuery({
    queryKey: ['serviceReports', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const res = await api.get(`/service-reports/${reportId}`);
      return res.data || null;
    },
    enabled: !!reportId,
  });
};

// ─── Mutation: Create Service Report & Auto Invalidate Cache ────────────────
export const useCreateServiceReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const res = await api.post('/service-reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Service Report uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['serviceReports'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit service report');
    },
  });
};
