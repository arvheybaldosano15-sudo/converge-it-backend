import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';

const TicketHistory = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tickets', { params: { page, limit: 10, status: 'history' } });
      if (res.success) {
        setTickets(res.data);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const columns = [
    {
      header: 'Ticket #',
      cell: (row) => <span className="font-mono text-xs font-bold text-cyan-400">{row.ticket_number}</span>,
    },
    {
      header: 'Completed / Closed Task',
      cell: (row) => (
        <div>
          <p className="font-bold text-white text-sm line-clamp-1">{row.title}</p>
          <span className="text-[11px] text-slate-400">{row.customer_name}</span>
        </div>
      ),
    },
    {
      header: 'Category',
      cell: (row) => <span className="text-xs text-slate-300">{row.category_name}</span>,
    },
    {
      header: 'Status',
      align: 'center',
      cell: (row) => {
        if (row.status === 'closed') {
          return <Badge variant="default">Closed</Badge>;
        }
        return <Badge variant="success">Resolved</Badge>;
      },
    },
    {
      header: 'Completed Date',
      align: 'center',
      cell: (row) => {
        const dateVal = row.resolved_at || row.updated_at || row.created_at;
        return (
          <span className="text-xs text-slate-400">
            {dateVal ? new Date(dateVal).toLocaleDateString() : '-'}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Service Work Order History</h1>
        <p className="text-xs text-slate-400">Archive of resolved and closed service calls</p>
      </div>

      <DataTable columns={columns} data={tickets} isLoading={loading} emptyMessage="No completed or closed tickets in history." />

      <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={10} onPageChange={setPage} />
    </div>
  );
};

export default TicketHistory;
