import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';
import toast from 'react-hot-toast';

const LOCAL_STORAGE_CACHE_KEY = 'CONVERGE_INSTALLATION_REQUESTS_CACHE';

// ─── Helper: Fetch Installation Requests ────────────────────────────────────
const fetchInstallationRequests = async () => {
  const catRes = await api.get('/categories');
  if (!catRes.success) throw new Error('Failed to fetch categories');

  const installCat = catRes.data.find((c) =>
    c.name.toLowerCase().includes('installation request')
  );
  if (!installCat) return [];

  const ticketsRes = await api.get('/tickets', {
    params: { category: installCat.id, limit: 100 },
  });

  if (!ticketsRes.success) throw new Error('Failed to fetch installation requests');

  const data = ticketsRes.data || [];
  try {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save installation requests to localStorage:', e);
  }

  return data;
};

// ─── Query Hook: Installation Requests List with Zero-Loading Caching ───────
export const useInstallationRequests = () => {
  return useQuery({
    queryKey: ['installation-requests'],
    queryFn: fetchInstallationRequests,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh cache
    gcTime: 1000 * 60 * 60 * 24, // 24 hours retention in storage
    initialData: () => {
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        return cached ? JSON.parse(cached) : undefined;
      } catch (e) {
        return undefined;
      }
    },
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
      return res.data;
    },
    onSuccess: () => {
      toast.success('Installation request deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['installation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete installation request');
    },
  });
};
