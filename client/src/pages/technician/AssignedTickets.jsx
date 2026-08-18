import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { Ticket, Eye, Edit, MapPin, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useTickets } from '../../hooks/useTickets';

const AssignedTickets = () => {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data: ticketsData, isLoading: loading } = useTickets({ page, limit: 10 });
  const tickets = ticketsData?.data || ticketsData || [];
  const totalPages = ticketsData?.pagination?.totalPages || 1;

  const columns = [
    {
      header: 'Ticket #',
      cell: (row) => <span className="font-mono text-xs font-bold text-cyan-400">{row.ticket_number}</span>,
    },
    {
      header: 'Task & Customer',
      cell: (row) => (
        <div>
          <p className="font-bold text-white text-sm line-clamp-1">{row.title}</p>
          <span className="text-[11px] text-slate-400">{row.customer_name} • {row.category_name}</span>
        </div>
      ),
    },
    {
      header: 'Priority',
      cell: (row) => (
        <Badge variant={row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warning' : 'cyan'}>
          {row.priority}
        </Badge>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <Badge variant={row.status === 'resolved' ? 'success' : 'primary'} className="capitalize">{row.status === 'open' ? 'pending' : row.status}</Badge>,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/technician/update/${row.id}`);
          }}
          icon={Edit}
        >
          Update
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Assigned Support Tasks</h1>
        <p className="text-xs text-slate-400">Field work orders assigned to you</p>
      </div>

      <DataTable
        columns={columns}
        data={tickets}
        isLoading={loading}
        onRowClick={(row) => navigate(`/technician/update/${row.id}`)}
        emptyMessage="No assigned tickets found."
      />

      <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={10} onPageChange={setPage} />
    </div>
  );
};

export default AssignedTickets;
