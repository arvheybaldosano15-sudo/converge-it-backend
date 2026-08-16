import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import toast from 'react-hot-toast';

// ─── Query: Fetch Tickets List with Zero-Loading Caching ──────────────────────
export const useTickets = (filters = {}) => {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      const res = await api.get('/tickets', { params: filters });
      return res.data || [];
    },
    staleTime: 1000 * 5, // 5 seconds
    refetchOnMount: 'always',
  });
};

// ─── Query: Fetch Single Ticket Details ──────────────────────────────────────
export const useTicket = (ticketId) => {
  return useQuery({
    queryKey: ['tickets', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const res = await api.get(`/tickets/${ticketId}`);
      return res.data || null;
    },
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 10,
    placeholderData: (previousData) => previousData,
  });
};

// ─── Mutation: Create Ticket & Auto Invalidate Cache ─────────────────────────
export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketData) => {
      const res = await api.post('/tickets', ticketData);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Ticket created successfully!');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create ticket');
    },
  });
};

// ─── Mutation: Update Ticket Status/Assignee & Auto Invalidate Cache ─────────
export const useUpdateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, updateData }) => {
      const res = await api.put(`/tickets/${ticketId}`, updateData);
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Ticket updated!');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update ticket');
    },
  });
};
