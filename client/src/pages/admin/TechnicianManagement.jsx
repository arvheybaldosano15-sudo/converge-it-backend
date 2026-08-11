import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { Wrench, UserCheck, UserSearch, UserX, Eye, Power, CheckCircle, XCircle, Trash2, Phone, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const TechnicianManagement = () => {
  const { searchQuery } = useOutletContext() || {};
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const [techToDelete, setTechToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const res = await api.get('/technicians', {
        params: { page, limit: 10, status: statusFilter, search: searchQuery },
      });
      if (res.success) {
        setTechnicians(res.data);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [page, statusFilter, searchQuery]);

  const toggleStatus = async (tech) => {
    const isCurrentlyActive = tech.status === 'approved' || tech.status === 'active';
    const newStatus = isCurrentlyActive ? 'inactive' : 'approved';
    try {
      const res = await api.put(`/technicians/${tech.id}/status`, { status: newStatus });
      if (res.success) {
        toast.success(`Technician status updated to ${newStatus}`);
        fetchTechnicians();
      }
    } catch (e) {
      toast.error(e.message || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!techToDelete) return;
    try {
      const res = await api.delete(`/technicians/${techToDelete.id}`);
      if (res.success) {
        toast.success('Technician removed');
        setIsDeleteModalOpen(false);
        fetchTechnicians();
      }
    } catch (e) {
      toast.error('Failed to remove technician');
    }
  };

  const columns = [
    {
      header: 'Employee ID & Name',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-cyan-400 block">{row.employee_id}</span>
          <span className="font-semibold text-white text-sm">{row.full_name}</span>
          <span className="text-[10px] text-slate-400 block">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Specialization',
      cell: (row) => <span className="text-xs font-medium text-slate-300">{row.specialization || 'Field Services'}</span>,
    },
    {
      header: 'Active Tasks',
      cell: (row) => <Badge variant="warning">{row.active_tickets || 0} Active</Badge>,
    },
    {
      header: 'Completed Tasks',
      cell: (row) => <Badge variant="success">{row.completed_tickets || 0} Done</Badge>,
    },
    {
      header: 'Status',
      cell: (row) => {
        const isActive = row.status === 'approved' || row.status === 'active';
        const isPending = row.status === 'pending';
        return (
          <Badge variant={isActive ? 'success' : isPending ? 'warning' : 'danger'}>
            {row.status}
          </Badge>
        );
      },
    },
    {
      header: 'Actions',
      cell: (row) => {
        const isActive = row.status === 'approved' || row.status === 'active';
        const isPending = row.status === 'pending';
        return (
          <div className="flex items-center space-x-2">
            {isPending ? (
              <button
                onClick={() => navigate('/admin/approvals')}
                className="p-2 rounded-xl glass-panel hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all"
                title="Review Technician Application"
              >
                <UserSearch className="w-4 h-4" />
              </button>
            ) : isActive ? (
              <button
                onClick={() => toggleStatus(row)}
                className="p-2 rounded-xl glass-panel hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all"
                title="Deactivate Technician"
              >
                <Power className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => toggleStatus(row)}
                className="p-2 rounded-xl glass-panel hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
                title="Activate Technician"
              >
                <Power className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                setTechToDelete(row);
                setIsDeleteModalOpen(true);
              }}
              className="p-2 rounded-xl glass-panel hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
              title="Remove Technician"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
          <h1 className="text-2xl font-bold text-white font-display">Technician Roster Management</h1>
          <p className="text-xs text-slate-400">Monitor field staff productivity, status, and task assignments</p>
        </div>

      <Card className="flex items-center gap-3 py-2.5 px-4">
        <span className="text-xs font-semibold text-slate-300">Filter Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="glass-input text-xs rounded-xl py-1.5 px-3"
        >
          <option value="all" className="bg-slate-900">All Technicians</option>
          <option value="active" className="bg-slate-900">Active Only</option>
          <option value="pending" className="bg-slate-900">Pending Approval</option>
          <option value="inactive" className="bg-slate-900">Inactive Only</option>
        </select>
      </Card>

      <DataTable columns={columns} data={technicians} isLoading={loading} emptyMessage="No technicians found." />

      <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={10} onPageChange={setPage} />

      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Remove Technician"
        message={`Are you sure you want to remove ${techToDelete?.full_name} (${techToDelete?.employee_id})?`}
      />
    </div>
  );
};

export default TechnicianManagement;
