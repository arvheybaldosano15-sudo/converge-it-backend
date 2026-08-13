import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import Loader from '../../components/common/Loader';
import {
  Wrench, UserCheck, UserSearch, UserX, Eye, Power, CheckCircle, XCircle,
  Trash2, Phone, Star, Search, Filter, ArrowUpDown, RefreshCw, Pencil,
  BarChart2, Clock, AlertTriangle, ShieldAlert, CheckSquare, Layers,
  ExternalLink, User, Hash, Mail, Activity, AlertCircle, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ─── Defined OUTSIDE parent component to prevent focus loss on re-render ───
const TechnicianForm = ({ formData, onChange, onSubmit, onCancel, submitLabel, isEdit = false }) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Input
        label="Full Name *"
        name="fullName"
        value={formData.fullName || ''}
        onChange={onChange}
        placeholder="e.g. Alex Rivera"
        icon={User}
        required
      />
      <Input
        label="Employee ID"
        name="employeeId"
        value={formData.employeeId || ''}
        onChange={onChange}
        placeholder={isEdit ? "Employee ID" : "Auto-generated if left blank"}
        icon={Hash}
      />
      <Input
        label="Email Address *"
        name="email"
        type="email"
        value={formData.email || ''}
        onChange={onChange}
        placeholder="e.g. tech.alex@converge.ph"
        icon={Mail}
        required
      />
      <Input
        label="Contact Number"
        name="contactNumber"
        value={formData.contactNumber || ''}
        onChange={onChange}
        placeholder="e.g. 09171234567"
        icon={Phone}
      />

      <div className="flex flex-col space-y-1.5 sm:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Field Specialization
        </label>
        <select
          name="specialization"
          value={formData.specialization || ''}
          onChange={onChange}
          className="glass-input w-full rounded-xl py-2 px-3 text-xs bg-slate-950 text-white"
        >
          <option value="Starlink Internet">Starlink Internet</option>
          <option value="Installation Request">Installation Request</option>
          <option value="CCTV System">CCTV System</option>
          <option value="Smart Devices">Smart Devices</option>
          <option value="Network Infrastructure">Network Infrastructure</option>
          <option value="General Field Services">General Field Services</option>
        </select>
      </div>

      <div className="flex flex-col space-y-1.5 sm:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Account Status
        </label>
        <select
          name="status"
          value={formData.status || 'active'}
          onChange={onChange}
          className="glass-input w-full rounded-xl py-2 px-3 text-xs bg-slate-950 text-white"
        >
          <option value="active">Active (Approved)</option>
          <option value="pending">Pending Review</option>
          <option value="inactive">Inactive (Suspended)</option>
        </select>
      </div>
    </div>

    <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
      <Button variant="ghost" type="button" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" type="submit">
        {submitLabel}
      </Button>
    </div>
  </form>
);

const TechnicianManagement = () => {
  const { searchQuery: globalSearch } = useOutletContext() || {};
  const navigate = useNavigate();

  // Data States
  const [technicians, setTechnicians] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [workloadFilter, setWorkloadFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals & Profile Detail
  const [selectedTech, setSelectedTech] = useState(null);
  const [techDetail, setTechDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [techToDelete, setTechToDelete] = useState(null);

  // Form State
  const emptyForm = {
    fullName: '',
    employeeId: '',
    email: '',
    contactNumber: '',
    specialization: 'Starlink Internet',
    status: 'active'
  };
  const [formData, setFormData] = useState(emptyForm);

  const activeSearch = localSearch || globalSearch || '';

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const [techRes, statsRes] = await Promise.all([
        api.get('/technicians', {
          params: {
            page,
            limit: 10,
            status: statusFilter,
            specialization: specializationFilter,
            workload: workloadFilter,
            search: activeSearch,
            sortBy,
            sortOrder
          },
        }),
        api.get('/technicians/stats').catch(() => null),
      ]);

      if (techRes.success) {
        setTechnicians(techRes.data || []);
        setTotalPages(techRes.pagination?.totalPages || 1);
        setTotalItems(techRes.pagination?.total || 0);
      }
      if (statsRes && statsRes.success) {
        setStats(statsRes.data || {});
      }
    } catch (e) {
      console.error('Failed to load technicians:', e);
      toast.error('Failed to load technician roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [page, statusFilter, specializationFilter, workloadFilter, activeSearch, sortBy, sortOrder]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const viewTechnicianProfile = async (tech, e) => {
    e?.stopPropagation();
    setSelectedTech(tech);
    setIsDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/technicians/${tech.id}`);
      if (res.success) {
        setTechDetail(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load technician detail profile');
    } finally {
      setLoadingDetail(false);
    }
  };

  const openEditModal = (tech, e) => {
    e?.stopPropagation();
    setSelectedTech(tech);
    setFormData({
      fullName: tech.full_name || '',
      employeeId: tech.employee_id || '',
      email: tech.email || '',
      contactNumber: tech.contact_number || '',
      specialization: tech.specialization || 'Starlink Internet',
      status: tech.status || 'active'
    });
    setIsEditModalOpen(true);
  };

  const toggleStatus = async (tech, e) => {
    e?.stopPropagation();
    const isCurrentlyActive = tech.status === 'approved' || tech.status === 'active';
    const newStatus = isCurrentlyActive ? 'inactive' : 'active';
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

  const handleEditTechnician = async (e) => {
    e.preventDefault();
    if (!selectedTech) return;
    try {
      const res = await api.put(`/technicians/${selectedTech.id}`, formData);
      if (res.success) {
        toast.success('Technician profile updated successfully');
        setIsEditModalOpen(false);
        setFormData(emptyForm);
        fetchTechnicians();
        if (techDetail && techDetail.id === selectedTech.id) {
          viewTechnicianProfile(selectedTech);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update technician profile');
    }
  };

  const handleDelete = async () => {
    if (!techToDelete) return;
    try {
      const res = await api.delete(`/technicians/${techToDelete.id}`);
      if (res.success) {
        toast.success('Technician record removed');
        setIsDeleteModalOpen(false);
        setTechToDelete(null);
        fetchTechnicians();
      }
    } catch (e) {
      toast.error('Failed to remove technician');
    }
  };

  const resetFilters = () => {
    setLocalSearch('');
    setStatusFilter('all');
    setSpecializationFilter('all');
    setWorkloadFilter('all');
    setSortBy('created_at');
    setSortOrder('DESC');
    setPage(1);
  };

  // Workload Badge Helper
  const getWorkloadInfo = (activeCount) => {
    const count = parseInt(activeCount) || 0;
    if (count === 0 || count === 1) {
      return { text: 'AVAILABLE', variant: 'success', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' };
    } else if (count === 2) {
      return { text: 'NORMAL WORKLOAD', variant: 'cyan', color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40' };
    } else if (count === 3) {
      return { text: 'BUSY', variant: 'warning', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40' };
    } else {
      return { text: 'OVERLOADED', variant: 'danger', color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40' };
    }
  };

  // SLA Helper
  const getSlaStatus = (slaDeadline, status) => {
    if (['resolved', 'closed'].includes(status)) return { text: 'RESOLVED', variant: 'success' };
    if (!slaDeadline) return { text: 'WITHIN SLA', variant: 'success' };
    const now = new Date();
    const deadline = new Date(slaDeadline);
    if (deadline < now) return { text: 'BREACHED', variant: 'danger' };
    const diffHours = (deadline - now) / (1000 * 60 * 60);
    if (diffHours <= 4) return { text: 'AT RISK', variant: 'warning' };
    return { text: 'WITHIN SLA', variant: 'success' };
  };

  // KPI Summary Cards
  const summaryCards = [
    {
      label: 'Total Technicians',
      count: parseInt(stats.total_technicians) || totalItems || 0,
      icon: Wrench,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
      border: 'border-cyan-500',
      active: statusFilter === 'all' && workloadFilter === 'all',
      onClick: () => resetFilters()
    },
    {
      label: 'Active Field Staff',
      count: parseInt(stats.active_technicians) || 0,
      icon: UserCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500',
      active: statusFilter === 'active',
      onClick: () => { setStatusFilter('active'); setWorkloadFilter('all'); setPage(1); }
    },
    {
      label: 'Available Staff',
      count: parseInt(stats.available_technicians) || 0,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500',
      active: workloadFilter === 'available',
      onClick: () => { setWorkloadFilter('available'); setStatusFilter('all'); setPage(1); }
    },
    {
      label: 'Active Tasks Staff',
      count: parseInt(stats.active_task_technicians) || 0,
      icon: Activity,
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
      border: 'border-amber-500',
      active: workloadFilter === 'normal' || workloadFilter === 'busy',
      onClick: () => { setWorkloadFilter('normal'); setStatusFilter('all'); setPage(1); }
    },
    {
      label: 'Overloaded Staff',
      count: parseInt(stats.overloaded_technicians) || 0,
      icon: ShieldAlert,
      color: 'text-rose-400',
      bg: 'bg-rose-500/20',
      border: 'border-rose-500',
      active: workloadFilter === 'overloaded',
      onClick: () => { setWorkloadFilter('overloaded'); setStatusFilter('all'); setPage(1); }
    },
  ];

  // Workload Chart Config
  const chartLabels = technicians.map(t => t.full_name ? t.full_name.split(' ')[0] + ' ' + (t.full_name.split(' ')[1] ? t.full_name.split(' ')[1][0] + '.' : '') : t.employee_id);
  const chartDataValues = technicians.map(t => parseInt(t.active_tickets) || 0);
  const chartColors = technicians.map(t => {
    const c = parseInt(t.active_tickets) || 0;
    if (c > 3) return '#f43f5e'; // rose
    if (c === 3) return '#f59e0b'; // amber
    return '#38bdf8'; // sky
  });

  const workloadChartData = {
    labels: chartLabels.length > 0 ? chartLabels : ['No Techs'],
    datasets: [
      {
        label: 'Active Assigned Tickets',
        data: chartDataValues.length > 0 ? chartDataValues : [0],
        backgroundColor: chartColors.length > 0 ? chartColors : ['#38bdf8'],
        borderRadius: 6,
        barThickness: 16,
      }
    ]
  };

  const workloadChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        grid: { color: '#1e293b' },
        ticks: { color: '#94a3b8', stepSize: 1, precision: 0 },
        border: { display: false },
        min: 0,
      },
      y: {
        grid: { display: false },
        ticks: { color: '#cbd5e1', font: { size: 11, weight: '600' } },
        border: { display: false }
      }
    }
  };

  const columns = [
    {
      header: 'Employee ID & Name',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-extrabold text-cyan-400 block">{row.employee_id}</span>
          <span className="font-bold text-white text-xs sm:text-sm">{row.full_name}</span>
          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Specialization',
      cell: (row) => (
        <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium">
          {row.specialization || 'Field Services'}
        </span>
      ),
    },
    {
      header: 'Active Tasks',
      cell: (row) => (
        <Badge variant={parseInt(row.active_tickets) > 3 ? 'danger' : parseInt(row.active_tickets) === 3 ? 'warning' : parseInt(row.active_tickets) > 0 ? 'cyan' : 'secondary'}>
          {row.active_tickets || 0} Active
        </Badge>
      ),
    },
    {
      header: 'Completed Tasks',
      cell: (row) => (
        <Badge variant="success">
          {row.completed_tickets || 0} Done
        </Badge>
      ),
    },
    {
      header: 'Workload Status',
      cell: (row) => {
        const info = getWorkloadInfo(row.active_tickets);
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${info.bg} ${info.color} ${info.border}`}>
            {info.text}
          </span>
        );
      },
    },
    {
      header: 'Status',
      cell: (row) => {
        const isActive = row.status === 'approved' || row.status === 'active';
        const isPending = row.status === 'pending';
        return (
          <Badge variant={isActive ? 'success' : isPending ? 'warning' : 'danger'} className="capitalize">
            {row.status === 'approved' ? 'active' : row.status}
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
          <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
            {/* View Detailed Profile */}
            <button
              onClick={(e) => viewTechnicianProfile(row, e)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
              title="View Detailed Technician Profile"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Edit Profile */}
            <button
              onClick={(e) => openEditModal(row, e)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
              title="Edit Technician Profile"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Status / Approve */}
            {isPending ? (
              <button
                onClick={() => navigate('/admin/approvals')}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                title="Review Pending Application"
              >
                <UserSearch className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={(e) => toggleStatus(row, e)}
                className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 transition-colors ${
                  isActive ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                }`}
                title={isActive ? 'Deactivate Technician' : 'Activate Technician'}
              >
                <Power className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Record */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTechToDelete(row);
                setIsDeleteModalOpen(true);
              }}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
              title="Remove Technician Record"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Technician Roster Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">Monitor field staff productivity, status, and task assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchTechnicians} icon={RefreshCw} className="text-slate-400 hover:text-white">
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/approvals')}
            icon={UserSearch}
          >
            Pending Approvals
          </Button>
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card
              key={idx}
              onClick={card.onClick}
              className={`flex items-center gap-3 p-3.5 transition-all duration-200 border-l-4 border-t-0 border-r-0 border-b-0 ${card.border} ${
                card.active ? 'bg-slate-800/90 ring-1 ring-cyan-500/50 brightness-110' : 'bg-slate-900/70 hover:bg-slate-800/60'
              } cursor-pointer`}
            >
              <div className={`p-2 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-lg font-extrabold font-display leading-none ${card.color}`}>{card.count}</h3>
                <p className="text-[11px] font-bold text-slate-200 mt-1 truncate">{card.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* TECHNICIAN WORKLOAD HORIZONTAL BAR CHART */}
      <Card className="p-4 space-y-3 bg-slate-950/80 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white font-display">Field Technician Workload & Capacity Analysis</h2>
          </div>
          <span className="text-[11px] text-slate-400">Live Ticket Assignments</span>
        </div>
        <div className="h-44 w-full pt-1">
          <Bar data={workloadChartData} options={workloadChartOptions} />
        </div>
      </Card>

      {/* Search & Filter Bar */}
      <Card className="p-4 space-y-3 bg-slate-950/70 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Workforce Search & Filter</span>
          </div>
          {(localSearch || statusFilter !== 'all' || specializationFilter !== 'all' || workloadFilter !== 'all' || sortBy !== 'created_at') && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-rose-400 hover:text-rose-300">
              Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Name, Employee ID, Specialization..."
              value={localSearch}
              onChange={(e) => { setLocalSearch(e.target.value); setPage(1); }}
              className="glass-input w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border-slate-700 bg-slate-900 text-white placeholder-slate-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="pending">Pending Approval</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Specialization Filter */}
          <select
            value={specializationFilter}
            onChange={(e) => { setSpecializationFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="all">All Specializations</option>
            <option value="Starlink">Starlink Internet</option>
            <option value="Installation">Installation Request</option>
            <option value="CCTV">CCTV System</option>
            <option value="Smart Devices">Smart Devices</option>
            <option value="Network">Network Infrastructure</option>
          </select>

          {/* Workload Filter */}
          <select
            value={workloadFilter}
            onChange={(e) => { setWorkloadFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="all">All Workload Levels</option>
            <option value="available">Available (0-1 tasks)</option>
            <option value="normal">Normal Workload (2 tasks)</option>
            <option value="busy">Busy (3 tasks)</option>
            <option value="overloaded">Overloaded (&gt;3 tasks)</option>
          </select>
        </div>

        {/* Sort Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sort By:</span>
            <button
              onClick={() => setSortBy('created_at')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'created_at' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'}`}
            >
              Joined Date
            </button>
            <button
              onClick={() => setSortBy('full_name')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'full_name' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'}`}
            >
              Name
            </button>
            <button
              onClick={() => setSortBy('workload')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'workload' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'}`}
            >
              Active Workload
            </button>
            <button
              onClick={() => setSortBy('completed_tickets')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'completed_tickets' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'}`}
            >
              Completed Tasks
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1"
            >
              Order: <span className="font-bold text-cyan-400">{sortOrder === 'DESC' ? 'Descending' : 'Ascending'}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Main Technician Table */}
      <DataTable
        columns={columns}
        data={technicians}
        isLoading={loading}
        emptyMessage="No field technicians found matching search & filter criteria."
      />

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <p className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{technicians.length > 0 ? (page - 1) * 10 + 1 : 0}</span> to{' '}
          <span className="font-bold text-white">{Math.min(page * 10, totalItems)}</span> of{' '}
          <span className="font-bold text-cyan-400">{totalItems}</span> technician records
        </p>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={10}
          onPageChange={setPage}
        />
      </div>

      {/* EDIT TECHNICIAN MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Technician Profile — ${selectedTech?.full_name || ''}`}
        maxWidth="max-w-xl"
      >
        <TechnicianForm
          formData={formData}
          onChange={handleInputChange}
          onSubmit={handleEditTechnician}
          onCancel={() => setIsEditModalOpen(false)}
          submitLabel="Update Profile"
          isEdit={true}
        />
      </Modal>

      {/* DETAILED TECHNICIAN PROFILE OVERVIEW MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title=""
        maxWidth="max-w-4xl"
      >
        {loadingDetail ? (
          <div className="p-8 text-center">
            <Loader text="Loading technician performance & assigned tickets..." />
          </div>
        ) : (selectedTech || techDetail) ? (
          (() => {
            const tech = techDetail || selectedTech;
            const workload = getWorkloadInfo(tech.active_tickets);

            return (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white font-display">{tech.full_name}</h2>
                      <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                        {tech.employee_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${workload.bg} ${workload.color} ${workload.border}`}>
                        {workload.text}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>Specialization: <strong className="text-slate-200">{tech.specialization || 'Field Services'}</strong></span>
                      <span>Status: <strong className="text-emerald-400 capitalize">{tech.status}</strong></span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Pencil}
                      onClick={(e) => { setIsDetailModalOpen(false); openEditModal(tech, e); }}
                    >
                      Edit Profile
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ExternalLink}
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate(`/admin/tickets?assignedTo=${tech.id}`);
                      }}
                    >
                      View All Tickets
                    </Button>
                  </div>
                </div>

                {/* 5 Performance Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Active Tasks</span>
                    <span className="text-lg font-extrabold text-amber-400 mt-0.5 block">{tech.active_tickets || 0}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Completed</span>
                    <span className="text-lg font-extrabold text-emerald-400 mt-0.5 block">{tech.completed_tickets || 0}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Total Assigned</span>
                    <span className="text-lg font-extrabold text-cyan-400 mt-0.5 block">{tech.total_tickets || 0}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">SLA Breaches</span>
                    <span className="text-lg font-extrabold text-rose-400 mt-0.5 block">{tech.sla_breaches || 0}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Completion Rate</span>
                    <span className="text-lg font-extrabold text-indigo-400 mt-0.5 block">{tech.completion_rate || 100}%</span>
                  </div>
                </div>

                {/* Contact & Detail Information Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">Contact Information</span>
                    <p className="text-slate-300 flex items-center gap-2 mt-1">
                      <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Email: <strong className="text-white">{tech.email}</strong></span>
                    </p>
                    <p className="text-slate-300 flex items-center gap-2 mt-1">
                      <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Phone: <strong className="text-white">{tech.contact_number || 'Not provided'}</strong></span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">Account & Activity</span>
                    <p className="text-slate-300 flex items-center gap-2 mt-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Joined Date: <strong className="text-white">{new Date(tech.created_at).toLocaleDateString()}</strong></span>
                    </p>
                    <p className="text-slate-300 flex items-center gap-2 mt-1">
                      <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Last Active Login: <strong className="text-white">{tech.last_login_at ? new Date(tech.last_login_at).toLocaleString() : 'Never logged in'}</strong></span>
                    </p>
                  </div>
                </div>

                {/* Current Assigned Tickets Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-display flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-cyan-400" />
                      Assigned Support Tickets ({tech.assignedTickets?.length || 0})
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Ticket ID</th>
                          <th className="p-2.5">Customer</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Priority</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Created Date</th>
                          <th className="p-2.5 text-right">SLA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(!tech.assignedTickets || tech.assignedTickets.length === 0) ? (
                          <tr>
                            <td colSpan="7" className="p-4 text-center text-slate-500 text-xs">
                              No tickets currently assigned to this technician.
                            </td>
                          </tr>
                        ) : (
                          tech.assignedTickets.map((t) => {
                            const sla = getSlaStatus(t.sla_deadline, t.status);
                            return (
                              <tr
                                key={t.id}
                                onClick={() => {
                                  setIsDetailModalOpen(false);
                                  navigate(`/admin/tickets?search=${t.ticket_number}`);
                                }}
                                className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                              >
                                <td className="p-2.5 font-mono font-bold text-cyan-400">{t.ticket_number}</td>
                                <td className="p-2.5 text-white font-bold">{t.customer_name || 'Customer'}</td>
                                <td className="p-2.5 text-slate-200">{t.category_name || 'General Support'}</td>
                                <td className="p-2.5">
                                  <Badge variant={t.priority === 'critical' ? 'danger' : t.priority === 'high' ? 'warning' : 'cyan'}>
                                    {t.priority}
                                  </Badge>
                                </td>
                                <td className="p-2.5">
                                  <Badge variant={t.status === 'resolved' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning'} className="capitalize">
                                    {t.status ? t.status.replace('_', ' ') : 'open'}
                                  </Badge>
                                </td>
                                <td className="p-2.5 text-slate-400">{new Date(t.created_at).toLocaleDateString()}</td>
                                <td className="p-2.5 text-right">
                                  <Badge variant={sla.variant}>{sla.text}</Badge>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Technician Activity Timeline */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white font-display flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Technician Work Log & Activity Timeline
                  </span>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                      <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 mt-0.5">
                        <Wrench className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-200 font-semibold">
                          Technician Registered <span className="text-cyan-400">({tech.employee_id})</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(tech.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    {tech.activityTimeline && tech.activityTimeline.map((act, i) => (
                      <div key={i} className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-200">
                            Ticket <strong className="text-cyan-300">{act.ticket_number}</strong> updated to{' '}
                            <Badge variant="cyan" className="capitalize">{act.status_changed_to ? act.status_changed_to.replace('_', ' ') : 'updated'}</Badge>
                          </p>
                          {act.notes && <p className="text-slate-300 text-[11px] mt-0.5 italic">{act.notes}</p>}
                          <p className="text-[10px] text-slate-500 mt-0.5">{new Date(act.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()
        ) : null}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Remove Technician Record"
        message={`Are you sure you want to permanently delete technician record for "${techToDelete?.full_name}" (${techToDelete?.employee_id})? This action cannot be undone.`}
      />
    </div>
  );
};

export default TechnicianManagement;
