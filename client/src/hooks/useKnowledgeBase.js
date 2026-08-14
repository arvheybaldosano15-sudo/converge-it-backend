import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import toast from 'react-hot-toast';

// ─── Query: Fetch Knowledge Base Articles with Cache Validation ──────────────
export const useKnowledgeBase = (filters = {}) => {
  return useQuery({
    queryKey: ['knowledgeBase', filters],
    queryFn: async () => {
      const res = await api.get('/knowledge-base', { params: filters });
      return res.data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes fresh cache for KB articles
  });
};

// ─── Query: Fetch Single Article Details ────────────────────────────────────
export const useKnowledgeBaseArticle = (articleIdOrSlug) => {
  return useQuery({
    queryKey: ['knowledgeBase', articleIdOrSlug],
    queryFn: async () => {
      if (!articleIdOrSlug) return null;
      const res = await api.get(`/knowledge-base/${articleIdOrSlug}`);
      return res.data || null;
    },
    enabled: !!articleIdOrSlug,
  });
};

// ─── Mutation: Create Article & Invalidate Cache ────────────────────────────
export const useCreateKBArticle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (articleData) => {
      const res = await api.post('/knowledge-base', articleData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Knowledge Base article created!');
      queryClient.invalidateQueries({ queryKey: ['knowledgeBase'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create article');
    },
  });
};
