import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import api from '../utils/axios';
import toast from 'react-hot-toast';
import {
  Ticket,
  ServiceReport,
  KBArticle,
  AnalyticsOverview,
  SlaPerformanceData,
  TicketTrendPoint,
  User,
  QUERY_KEYS
} from '../types/cache';

// ─── Typed Query: Fetch Tickets with TypeScript Cache Validation ─────────────
export const useTypedTickets = (filters: Record<string, any> = {}) => {
  return useQuery<Ticket[], Error>({
    queryKey: [QUERY_KEYS.TICKETS, filters],
    queryFn: async (): Promise<Ticket[]> => {
      const res = await api.get('/tickets', { params: filters });
      return res.data || [];
    },
    staleTime: 1000 * 60 * 3,
  });
};

// ─── Typed Query: Fetch Analytics Overview with TypeScript Cache Validation ─
export const useTypedAnalytics = (params: Record<string, any> = {}) => {
  return useQuery<AnalyticsOverview, Error>({
    queryKey: [QUERY_KEYS.ANALYTICS, 'overview', params],
    queryFn: async (): Promise<AnalyticsOverview> => {
      const res = await api.get('/analytics/overview', { params });
      return res.data || {};
    },
    staleTime: 1000 * 60 * 5,
  });
};

// ─── Typed Query: Fetch SLA Performance Data ─────────────────────────────────
export const useTypedSlaPerformance = (params: Record<string, any> = {}) => {
  return useQuery<SlaPerformanceData, Error>({
    queryKey: [QUERY_KEYS.ANALYTICS, 'sla', params],
    queryFn: async (): Promise<SlaPerformanceData> => {
      const res = await api.get('/analytics/sla-performance', { params });
      return res.data || { within_sla: 0, at_risk: 0, breached: 0, no_sla: 0 };
    },
    staleTime: 1000 * 60 * 5,
  });
};

// ─── Typed Mutation: Ticket Status Update ────────────────────────────────────
export const useTypedTicketStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<Ticket, Error, { ticketId: string; status: Ticket['status'] }>({
    mutationFn: async ({ ticketId, status }): Promise<Ticket> => {
      const res = await api.put(`/tickets/${ticketId}`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Ticket status updated to ${data.status}`);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TICKETS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ANALYTICS] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update status');
    },
  });
};
