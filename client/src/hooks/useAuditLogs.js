import { useQuery } from '@tanstack/react-query';
import api from '../utils/axios';

export const useAuditLogs = (params = {}) => {
  return useQuery({
    queryKey: ['auditLogs', params],
    queryFn: async () => {
      const res = await api.get('/audit-logs', { params });
      return res || { data: [], pagination: { totalPages: 1 } };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes fresh cache
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
};
