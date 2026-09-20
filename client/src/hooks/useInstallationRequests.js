import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import toast from 'react-hot-toast';

const LOCAL_STORAGE_CACHE_KEY = 'CONVERGE_INSTALLATION_REQUESTS_CACHE';

let memoryInstallationCache = (() => {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    return [];
  }
})();

// ─── Helper: Fetch Installation Requests ────────────────────────────────────
const fetchInstallationRequests = async () => {
  const ticketsRes = await api.get('/tickets', {
    params: { categoryName: 'Installation Request', limit: 50 },
  });

  if (!ticketsRes.success) throw new Error('Failed to fetch installation requests');

  const data = ticketsRes.data || [];
  memoryInstallationCache = data;
  try {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_CACHE_KEY);
      } catch (_) {}
    }
  }

  return data;
};

// ─── Query Hook: Installation Requests List with Zero-Loading Caching ───────
export const useInstallationRequests = () => {
  return useQuery({
    queryKey: ['installation-requests'],
    queryFn: fetchInstallationRequests,
    staleTime: 0, // Always stale → always refetch in background immediately on mount
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Background poll every 5s
    gcTime: 1000 * 60 * 60 * 24, // 24 hours retention in storage
    initialData: () => {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
      return memoryInstallationCache || [];
    },
    // 0 = epoch → data is always considered stale → React Query refetches immediately
    // on every mount instead of waiting for staleTime to expire (which caused 5s delay)
    initialDataUpdatedAt: 0,
    placeholderData: (previousData) => previousData,
  });
};

// ─── Mutation Hooks for Installation Requests ──────────────────────────────
export const useAssignTechnician = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, technicianId }) => {
      const res = await api.put(`/tickets/${ticketId}`, {
        assignedTo: technicianId || null,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Technician assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['installation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to assign technician');
    },
  });
};

export const useUpdateInstallationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status }) => {
      const res = await api.put(`/tickets/${ticketId}`, { status });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success(`Status updated to ${variables.status.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['installation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update status');
    },
  });
};

export const useDeleteInstallationRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId) => {
      const res = await api.delete(`/tickets/${ticketId}`);
      return { res: res.data, ticketId };
    },
    onSuccess: (data, variables) => {
      const deletedId = variables || data?.ticketId;
      toast.success('Installation request deleted successfully');
      if (deletedId) {
        queryClient.setQueryData(['installation-requests'], (old = []) => {
          const updated = (old || []).filter((t) => t.id !== deletedId);
          try {
            localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['installation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete installation request');
    },
  });
};
