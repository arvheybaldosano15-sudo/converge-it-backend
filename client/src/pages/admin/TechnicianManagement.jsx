import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import { Wrench, UserCheck, CheckCircle, XCircle, Trash2, Phone, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const TechnicianManagement = () => {
  const { searchQuery } = useOutletContext() || {};
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('active');

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
    const newStatus = tech.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.put(`/technicians/${tech.id}/status`, { status: newStatus });
      if (res.success) {
        toast.success(`Technician status updated to ${newStatus}`);
        fetchTechnicians();
      }
    } catch (e) {
      toast.error('Failed to update status');
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
      cell: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : row.status === 'pending' ? 'warning' : 'default'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <Button
            variant={row.status === 'active' ? 'secondary' : 'success'}
            size="sm"
            onClick={() => toggleStatus(row)}
          >
            {row.status === 'active' ? 'Deactivate' : 'Activate'}
          </Button>
          <button
            onClick={() => {
              setTechToDelete(row);
              setIsDeleteModalOpen(true);
            }}
            className="p-1.5 rounded-lg glass-panel hover:bg-rose-500/20 text-rose-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Technician Roster Management</h1>
          <p className="text-xs text-slate-400">Monitor field staff productivity, status, and task assignments</p>
        </div>
        <Button variant="warning" onClick={() => navigate('/admin/approvals')} icon={UserCheck}>
          Pending Registrations
        </Button>
      </div>

      <Card className="flex items-center gap-3 py-2.5 px-4">
        <span className="text-xs font-semibold text-slate-300">Filter Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="glass-input text-xs rounded-xl py-1.5 px-3"
        >
          <option value="active" className="bg-slate-900">Active Only</option>
          <option value="inactive" className="bg-slate-900">Inactive Only</option>
          <option value="" className="bg-slate-900">All Technicians</option>
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
