import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { Edit } from 'lucide-react';

import { useTickets } from '../../hooks/useTickets';
import UpdateTicketModal from '../../components/technician/UpdateTicketModal';
import FileServiceReportModal from '../../components/technician/FileServiceReportModal';

const AssignedTickets = () => {
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [reportTicket, setReportTicket] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const { data: ticketsData, isLoading: loading } = useTickets({ page, limit: 10 });
  const tickets = ticketsData?.data || ticketsData || [];
  const totalPages = ticketsData?.pagination?.totalPages || 1;

  const handleOpenUpdate = (ticket, e) => {
    if (e) e.stopPropagation();
    setSelectedTicket(ticket);
    setIsUpdateModalOpen(true);
  };

  const handleOpenFileReport = (ticket) => {
    setReportTicket(ticket);
    setIsReportModalOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'technician'] });
  };

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
      cell: (row) => {
        const variantMap = {
          open: 'warning',
          in_progress: 'primary',
          on_hold: 'purple',
          resolved: 'success',
          closed: 'default'
        };
        const displayStatus = row.status === 'open' ? 'pending' : row.status;
        return (
          <Badge variant={variantMap[row.status] || 'default'} className="capitalize">
            {displayStatus ? displayStatus.replace('_', ' ') : ''}
          </Badge>
        );
      }
    },
    {
      header: 'Actions',
      cell: (row) => (
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => handleOpenUpdate(row, e)}
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
        onRowClick={(row) => handleOpenUpdate(row)}
        emptyMessage="No assigned tickets found."
      />

      <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={10} onPageChange={setPage} />

      {/* Update Ticket Modal */}
      <UpdateTicketModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        ticket={selectedTicket}
        onSuccess={handleSuccess}
        onOpenFileServiceReport={handleOpenFileReport}
      />

      {/* File Service Report Modal */}
      <FileServiceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        ticket={reportTicket}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default AssignedTickets;
