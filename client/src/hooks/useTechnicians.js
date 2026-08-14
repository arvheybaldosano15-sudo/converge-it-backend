import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import toast from 'react-hot-toast';

// ─── Query: Fetch Technicians List with Cache Validation ────────────────────
export const useTechnicians = (filters = {}) => {
  return useQuery({
    queryKey: ['technicians', filters],
    queryFn: async () => {
      const res = await api.get('/technicians', { params: filters });
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh cache
  });
};

// ─── Mutation: Approve/Reject Technician & Auto Invalidate Cache ───────────
export const useApproveTechnician = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }) => {
      const res = await api.put(`/technicians/${id}/approval`, { status, notes });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success(`Technician status updated to ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update technician status');
    },
  });
};
