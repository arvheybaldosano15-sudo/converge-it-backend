import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import toast from 'react-hot-toast';

// ─── Query: AI Recommendations with 30-Minute Caching ────────────────────────
export const useAiRecommendations = () => {
  return useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: async () => {
      const res = await api.get('/ai/recommendations');
      return res?.data || [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes fresh cache for expensive AI recommendations
    gcTime: 1000 * 60 * 60 * 24, // 24 hours persistence retention
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
};

// ─── Mutation: Apply AI Recommendation & Invalidate Cache ───────────────────
export const useApplyAiRecommendation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recId) => {
      const res = await api.post(`/ai/recommendations/${recId}/apply`);
      return res?.data;
    },
    onSuccess: () => {
      toast.success('AI Recommendation applied successfully!');
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to apply recommendation');
    },
  });
};
