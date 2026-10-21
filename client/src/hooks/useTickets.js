import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import toast from 'react-hot-toast';

const TECH_ASSIGNED_TICKETS_KEY = 'CONVERGE_TECH_ASSIGNED_TICKETS_CACHE_V3';

const getStoredTickets = (filters = {}) => {
  // Return stored cache on frame 0 if no custom search/filter is active
  const isDefaultFilter = !filters.search &&
    (!filters.status || filters.status === 'all') &&
    (!filters.priority || filters.priority === 'all') &&
    (!filters.category || filters.category === 'all');
  if (!isDefaultFilter) return undefined;

  try {
    const raw = localStorage.getItem(TECH_ASSIGNED_TICKETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_) {}
  return undefined;
};

// ─── Query: Fetch Tickets List with Clean TanStack Query Cache ────────────────
export const useTickets = (filters = {}) => {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: async () => {
      const res = await api.get('/tickets', {
        params: { ...filters, fresh: true, _t: Date.now() },
      });
      const data = res.data || [];
      const isDefaultFilter = !filters.search &&
        (!filters.status || filters.status === 'all') &&
        (!filters.priority || filters.priority === 'all') &&
        (!filters.category || filters.category === 'all');
      if (isDefaultFilter && Array.isArray(data) && data.length > 0) {
        try {
          localStorage.setItem(TECH_ASSIGNED_TICKETS_KEY, JSON.stringify(data));
        } catch (_) {}
      }
      return data;
    },
    initialData: () => getStoredTickets(filters),
    staleTime: 0,                    // Always consider data stale → always refetch in background immediately
    refetchOnMount: 'always',        // Refetch every time component mounts (including page refresh / hard refresh)
    refetchOnWindowFocus: true,      // Refetch when tab/app regains focus on mobile
    refetchOnReconnect: true,        // Refetch when network reconnects
    refetchInterval: 5000,           // Poll every 5s in background for real-time updates
    gcTime: 1000 * 60 * 5,           // 5 minutes in memory
  });
};

// ─── Query: Fetch Single Ticket Details ──────────────────────────────────────
export const useTicket = (ticketId) => {
  return useQuery({
    queryKey: ['tickets', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      const res = await api.get(`/tickets/${ticketId}`, { params: { fresh: true } });
      return res.data || null;
    },
    enabled: !!ticketId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
