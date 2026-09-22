import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import toast from 'react-hot-toast';

const LOCAL_STORAGE_TICKETS_CACHE_KEY = 'CONVERGE_TICKETS_MAIN_CACHE_V2';

let memoryTicketsCache = (() => {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_TICKETS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    return [];
  }
})();

// ─── Query: Fetch Tickets List with Zero-Loading Caching ──────────────────────
export const useTickets = (filters = {}) => {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      const res = await api.get('/tickets', { params: filters });
      const data = res.data || [];
      if (Array.isArray(data) && !filters.search && !filters.status) {
        memoryTicketsCache = data;
        try {
          localStorage.setItem(LOCAL_STORAGE_TICKETS_CACHE_KEY, JSON.stringify(data));
        } catch (e) {}
      }
      return data;
    },
    staleTime: 0,                    // Always consider data stale → always refetch in background immediately
    refetchOnMount: 'always',        // Refetch every time component mounts (including page refresh / hard refresh)
    refetchOnWindowFocus: true,      // Refetch when tab/app regains focus on mobile
    refetchOnReconnect: true,        // Refetch when network reconnects
    refetchInterval: 5000,           // Poll every 5s in background for real-time feel
    gcTime: 1000 * 60 * 60 * 24,     // 24 hours retention in storage
    initialData: () => {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_TICKETS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
      return memoryTicketsCache || [];
    },
    // 0 = epoch → data is always considered stale → React Query refetches immediately
    // on every mount/hard refresh in background while displaying cached data instantly (0ms)
    initialDataUpdatedAt: 0,
    placeholderData: (previousData) => previousData,
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
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
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
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update ticket');
    },
  });
};
