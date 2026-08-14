import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { ShieldCheck } from 'lucide-react';

import { useAuditLogs } from '../../hooks/useAuditLogs';

const AuditLogs = () => {
  const [page, setPage] = useState(1);
  const { data: resData, isLoading: loading } = useAuditLogs({ page, limit: 15 });
  const logs = resData?.data || [];
  const totalPages = resData?.pagination?.totalPages || 1;

  const columns = [
    {
      header: 'Actor',
      cell: (row) => (
        <div>
          <span className="font-semibold text-white text-xs">{row.actor_name || 'System Auto'}</span>
          <span className="text-[10px] text-slate-400 block capitalize">{row.actor_role || 'system'}</span>
        </div>
      ),
    },
    {
      header: 'Action',
      cell: (row) => (
        <Badge
          variant={
            row.action === 'login' ? 'cyan' : row.action === 'approve' ? 'success' : row.action === 'delete' ? 'danger' : 'default'
          }
        >
          {row.action.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Target Type & ID',
      cell: (row) => (
        <span className="text-xs text-slate-300 font-mono">
          {row.target_type}: {row.target_description || row.target_id || '-'}
        </span>
      ),
    },
    {
      header: 'IP Address',
      cell: (row) => <span className="text-xs text-slate-400 font-mono">{row.ip_address || '127.0.0.1'}</span>,
    },
    {
      header: 'Timestamp',
      cell: (row) => <span className="text-xs text-slate-400">{new Date(row.created_at).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">System Audit Logs & Security Trail</h1>
        <p className="text-xs text-slate-400">Immutable record of all administrator actions, approvals, and security events</p>
      </div>

      <DataTable columns={columns} data={logs} isLoading={loading} emptyMessage="No audit logs recorded." />

      <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={15} onPageChange={setPage} />
    </div>
  );
};

export default AuditLogs;
