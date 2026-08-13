import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import Loader from '../../components/common/Loader';
import {
  CheckCircle, XCircle, Clock, Phone, ShieldAlert, ShieldCheck,
  UserCheck, AlertTriangle, Eye, RefreshCw, Search, Filter,
  ArrowUpDown, Calendar, Mail, Wrench, User, Hash, FileText,
  Activity, UserX, UserSearch, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const TechnicianApproval = () => {
  const navigate = useNavigate();

  // Data States
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab & Filters
  const [activeTab, setActiveTab] = useState('pending');
  const [localSearch, setLocalSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [specializationFilter, setSpecializationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [page, setPage] = useState(1);

  // Modals & Selected Tech
  const [selectedTech, setSelectedTech] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [reactivateConfirmOpen, setReactivateConfirmOpen] = useState(false);
  const [modalReason, setModalReason] = useState('');
  const [techToAction, setTechToAction] = useState(null);

  const fetchTechs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/technicians/pending');
      if (res.success) {
        setTechs(res.data || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load technician applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechs();
  }, []);

  // Action Handlers
  const handleApproveConfirm = async () => {
    if (!techToAction) return;
    try {
      const res = await api.post(`/technicians/${techToAction.id}/approve`);
      if (res.success) {
        toast.success(`Approved technician account for ${techToAction.full_name}! Status is now Active.`);
        setApproveConfirmOpen(false);
        setIsDetailModalOpen(false);
        setTechToAction(null);
        fetchTechs();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to approve technician');
    }
  };

  const handleReactivateConfirm = async () => {
    if (!techToAction) return;
    try {
      const res = await api.put(`/technicians/${techToAction.id}/status`, { status: 'active' });
      if (res.success) {
        toast.success(`Reactivated technician account for ${techToAction.full_name}.`);
        setReactivateConfirmOpen(false);
        setIsDetailModalOpen(false);
        setTechToAction(null);
        fetchTechs();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reactivate technician');
    }
  };

  const handleReject = async () => {
    if (!techToAction) return;
    if (!modalReason || !modalReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    try {
      const res = await api.post(`/technicians/${techToAction.id}/reject`, { reason: modalReason });
      if (res.success) {
        toast.success(`Rejected application for ${techToAction.full_name}`);
        setRejectModalOpen(false);
        setIsDetailModalOpen(false);
        setModalReason('');
        setTechToAction(null);
        fetchTechs();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject technician');
    }
  };

  const handleSuspend = async () => {
    if (!techToAction) return;
    if (!modalReason || !modalReason.trim()) {
      toast.error('Please enter a suspension reason');
      return;
    }
    try {
      const res = await api.post(`/technicians/${techToAction.id}/suspend`, { reason: modalReason });
      if (res.success) {
        toast.success(`Suspended account for ${techToAction.full_name}`);
        setSuspendModalOpen(false);
        setIsDetailModalOpen(false);
        setModalReason('');
        setTechToAction(null);
        fetchTechs();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to suspend technician');
    }
  };

  // Open Detail Modal
  const openDetailModal = (tech, e) => {
    e?.stopPropagation();
    setSelectedTech(tech);
    setIsDetailModalOpen(true);
  };

  // Counts for Tabs & Summary Indicators
  const counts = {
    pending: techs.filter((t) => t.status === 'pending').length,
    active: techs.filter((t) => t.status === 'active' || t.status === 'approved').length,
    suspended: techs.filter((t) => t.status === 'inactive').length,
    rejected: techs.filter((t) => t.status === 'rejected').length,
  };

  // Filtered & Sorted Technicians List
  const filteredTechs = techs.filter((t) => {
    // Tab Status Matching
    if (activeTab === 'pending' && t.status !== 'pending') return false;
    if (activeTab === 'active' && t.status !== 'active' && t.status !== 'approved') return false;
    if (activeTab === 'suspended' && t.status !== 'inactive') return false;
    if (activeTab === 'rejected' && t.status !== 'rejected') return false;

    // Search Query Matching
    if (localSearch && localSearch.trim() !== '') {
      const q = localSearch.toLowerCase().trim();
      const matchName = t.full_name?.toLowerCase().includes(q);
      const matchId = t.employee_id?.toLowerCase().includes(q);
      const matchEmail = t.email?.toLowerCase().includes(q);
      const matchContact = t.contact_number?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchEmail && !matchContact) return false;
    }

    // Specialization Filter
    if (specializationFilter !== 'all' && (!t.specialization || !t.specialization.toLowerCase().includes(specializationFilter.toLowerCase()))) {
      return false;
    }

    // Department Filter
    if (departmentFilter !== 'all' && (!t.department || !t.department.toLowerCase().includes(departmentFilter.toLowerCase()))) {
      return false;
    }

    // Date Filter
    if (dateFilter !== 'all' && t.created_at) {
      const created = new Date(t.created_at);
      const now = new Date();
      if (dateFilter === 'today') {
        if (created.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === '7days') {
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      } else if (dateFilter === '30days') {
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        if (diffDays > 30) return false;
      }
    }

    return true;
  }).sort((a, b) => {
    let valA = a[sortBy] || '';
    let valB = b[sortBy] || '';
    if (sortBy === 'created_at') {
      valA = new Date(a.created_at || 0).getTime();
      valB = new Date(b.created_at || 0).getTime();
    }
    if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
    if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
    return 0;
  });

  const resetFilters = () => {
    setLocalSearch('');
    setDepartmentFilter('all');
    setSpecializationFilter('all');
    setDateFilter('all');
    setSortBy('created_at');
    setSortOrder('DESC');
    setPage(1);
  };

  const paginatedTechs = filteredTechs.slice((page - 1) * 10, page * 10);
  const totalPages = Math.ceil(filteredTechs.length / 10) || 1;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'active':
      case 'approved':
        return (
          <Badge variant="success" className="capitalize">
            <ShieldCheck className="w-3 h-3 inline mr-1" /> Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary" className="capitalize">
            <ShieldAlert className="w-3 h-3 inline mr-1" /> Suspended
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" className="capitalize">
            <XCircle className="w-3 h-3 inline mr-1" /> Rejected
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="warning" className="capitalize">
            <Clock className="w-3 h-3 inline mr-1" /> Pending Review
          </Badge>
        );
    }
  };

  // KPI Summary Cards
  const summaryCards = [
    {
      key: 'pending',
      label: 'Pending Reviews',
      count: counts.pending,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
      border: 'border-amber-500',
      active: activeTab === 'pending',
      onClick: () => { setActiveTab('pending'); setPage(1); }
    },
    {
      key: 'active',
      label: 'Active Technicians',
      count: counts.active,
      icon: UserCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500',
      active: activeTab === 'active',
      onClick: () => { setActiveTab('active'); setPage(1); }
    },
    {
      key: 'suspended',
      label: 'Suspended Access',
      count: counts.suspended,
      icon: ShieldAlert,
      color: 'text-slate-400',
      bg: 'bg-slate-500/20',
      border: 'border-slate-500',
      active: activeTab === 'suspended',
      onClick: () => { setActiveTab('suspended'); setPage(1); }
    },
    {
      key: 'rejected',
      label: 'Rejected Applications',
      count: counts.rejected,
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/20',
      border: 'border-rose-500',
      active: activeTab === 'rejected',
      onClick: () => { setActiveTab('rejected'); setPage(1); }
    },
  ];

  const columns = [
    {
      header: 'Employee ID & Name',
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-extrabold text-cyan-400 block">{row.employee_id || 'TEMP-ID'}</span>
          <span className="font-bold text-white text-xs sm:text-sm">{row.full_name}</span>
          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Contact',
      cell: (row) => (
        <p className="text-xs text-slate-300 flex items-center gap-1">
          <Phone className="w-3 h-3 text-cyan-400 shrink-0" />
          <span>{row.contact_number || 'Not provided'}</span>
        </p>
      ),
    },
    {
      header: 'Specialization & Dept',
      cell: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-white block">{row.specialization || 'General Services'}</span>
          <span className="text-[10px] text-slate-400">{row.department || 'Field Services'}</span>
        </div>
      ),
    },
    {
      header: 'Registered On',
      cell: (row) => (
        <span className="text-xs text-slate-400">
          {row.created_at ? new Date(row.created_at).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => renderStatusBadge(row.status),
    },
    {
      header: 'Actions',
      cell: (row) => {
        const isPending = row.status === 'pending';
        const isActive = row.status === 'active' || row.status === 'approved';
        const isSuspended = row.status === 'inactive';
        const isRejected = row.status === 'rejected';

        return (
          <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
            {/* View Profile / Application */}
            <button
              onClick={(e) => openDetailModal(row, e)}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
              title="View Application Profile"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Approve Action (For Pending & Suspended) */}
            {(isPending || isSuspended) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTechToAction(row);
                  if (isSuspended) {
                    setReactivateConfirmOpen(true);
                  } else {
                    setApproveConfirmOpen(true);
                  }
                }}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs px-2"
                title={isSuspended ? "Reactivate Account" : "Approve Account"}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="font-semibold">{isSuspended ? 'Reactivate' : 'Approve'}</span>
              </button>
            )}

            {/* Suspend Action (For Active) */}
            {isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTechToAction(row);
                  setModalReason('');
                  setSuspendModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs px-2"
                title="Suspend Portal Access"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="font-semibold">Suspend</span>
              </button>
            )}

            {/* Reject Action (For Pending) */}
            {isPending && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTechToAction(row);
                  setModalReason('');
                  setRejectModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs px-2"
                title="Reject Application"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span className="font-semibold">Reject</span>
              </button>
            )}
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
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Technician Approvals & Status</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage technician registrations, approvals, rejections, and portal suspensions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchTechs} icon={RefreshCw} className="text-slate-400 hover:text-white">
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/technicians')} icon={Wrench}>
            Technician Roster
          </Button>
        </div>
      </div>

      {/* 4 Clickable Status KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.key}
              onClick={card.onClick}
              className={`flex items-center gap-3 p-4 transition-all duration-200 border-l-4 border-t-0 border-r-0 border-b-0 ${card.border} ${
                card.active ? 'bg-slate-800/90 ring-1 ring-cyan-500/50 brightness-110' : 'bg-slate-900/70 hover:bg-slate-800/60'
              } cursor-pointer`}
            >
              <div className={`p-2.5 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-xl font-extrabold font-display leading-none ${card.color}`}>{card.count}</h3>
                <p className="text-xs font-bold text-slate-200 mt-1 truncate">{card.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4 space-y-3 bg-slate-950/70 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Filter Registrations & Applications</span>
          </div>
          {(localSearch || departmentFilter !== 'all' || specializationFilter !== 'all' || dateFilter !== 'all' || sortBy !== 'created_at') && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-rose-400 hover:text-rose-300">
              Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Name, Employee ID, Email..."
              value={localSearch}
              onChange={(e) => { setLocalSearch(e.target.value); setPage(1); }}
              className="glass-input w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border-slate-700 bg-slate-900 text-white placeholder-slate-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="all">All Departments</option>
            <option value="Field Services">Field Services</option>
            <option value="Network Infrastructure">Network Infrastructure</option>
            <option value="Customer Support">Customer Support</option>
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
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="all">All Registration Dates</option>
            <option value="today">Registered Today</option>
            <option value="7days">Registered Last 7 Days</option>
            <option value="30days">Registered Last 30 Days</option>
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
              Registration Date
            </button>
            <button
              onClick={() => setSortBy('full_name')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'full_name' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'}`}
            >
              Technician Name
            </button>
            <button
              onClick={() => setSortBy('status')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'status' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'}`}
            >
              Status
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

      {/* Main Approval Table */}
      <DataTable
        columns={columns}
        data={paginatedTechs}
        isLoading={loading}
        emptyMessage={`No technician applications found in ${activeTab} status.`}
      />

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <p className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{filteredTechs.length > 0 ? (page - 1) * 10 + 1 : 0}</span> to{' '}
          <span className="font-bold text-white">{Math.min(page * 10, filteredTechs.length)}</span> of{' '}
          <span className="font-bold text-cyan-400">{filteredTechs.length}</span> applications ({activeTab})
        </p>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredTechs.length}
          itemsPerPage={10}
          onPageChange={setPage}
        />
      </div>

      {/* DETAILED TECHNICIAN APPLICATION PROFILE MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title=""
        maxWidth="max-w-3xl"
      >
        {selectedTech && (
          <div className="space-y-5 text-xs">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white font-display">{selectedTech.full_name}</h2>
                  <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                    {selectedTech.employee_id || 'TEMP-ID'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span>Registered: <strong className="text-slate-200">{new Date(selectedTech.created_at).toLocaleDateString()}</strong></span>
                  <span>Specialization: <strong className="text-cyan-300">{selectedTech.specialization || 'Field Services'}</strong></span>
                </p>
              </div>

              <div>{renderStatusBadge(selectedTech.status)}</div>
            </div>

            {/* Detail Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">Contact Information</span>
                <p className="text-slate-300 flex items-center gap-2 mt-1">
                  <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Email: <strong className="text-white">{selectedTech.email}</strong></span>
                </p>
                <p className="text-slate-300 flex items-center gap-2 mt-1">
                  <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Phone: <strong className="text-white">{selectedTech.contact_number || 'Not provided'}</strong></span>
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">Assignment & Department</span>
                <p className="text-slate-300 flex items-center gap-2 mt-1">
                  <Wrench className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Specialization: <strong className="text-white">{selectedTech.specialization || 'General Installation'}</strong></span>
                </p>
                <p className="text-slate-300 flex items-center gap-2 mt-1">
                  <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Department: <strong className="text-white">{selectedTech.department || 'Field Services'}</strong></span>
                </p>
              </div>
            </div>

            {/* Approval History & Activity Timeline */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white font-display flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Approval History & Registration Audit Log
              </span>

              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {/* Event 1: Registration Submitted */}
                <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-200 font-semibold">
                      Technician Application Submitted <span className="text-cyan-400">({selectedTech.employee_id})</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(selectedTech.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Event 2: Status Log */}
                <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-200">
                      Current Account Status: {renderStatusBadge(selectedTech.status)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">System Audit Verified</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons inside Modal */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>

              {selectedTech.status === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={XCircle}
                    onClick={() => {
                      setTechToAction(selectedTech);
                      setModalReason('');
                      setRejectModalOpen(true);
                    }}
                  >
                    Reject Application
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircle}
                    onClick={() => {
                      setTechToAction(selectedTech);
                      setApproveConfirmOpen(true);
                    }}
                  >
                    Approve Technician
                  </Button>
                </>
              )}

              {(selectedTech.status === 'active' || selectedTech.status === 'approved') && (
                <Button
                  variant="warning"
                  size="sm"
                  icon={ShieldAlert}
                  onClick={() => {
                    setTechToAction(selectedTech);
                    setModalReason('');
                    setSuspendModalOpen(true);
                  }}
                >
                  Suspend Account
                </Button>
              )}

              {selectedTech.status === 'inactive' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle}
                  onClick={() => {
                    setTechToAction(selectedTech);
                    setReactivateConfirmOpen(true);
                  }}
                >
                  Reactivate Account
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* APPROVE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={approveConfirmOpen}
        onClose={() => setApproveConfirmOpen(false)}
        onConfirm={handleApproveConfirm}
        title="Approve Technician Application"
        message={`Approving "${techToAction?.full_name}" (${techToAction?.employee_id}) will activate their technician account and allow them to log into the mobile portal, receive ticket assignments, and participate in field support operations. Do you want to proceed?`}
      />

      {/* REACTIVATE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={reactivateConfirmOpen}
        onClose={() => setReactivateConfirmOpen(false)}
        onConfirm={handleReactivateConfirm}
        title="Reactivate Technician Account"
        message={`Are you sure you want to reactivate the technician account for "${techToAction?.full_name}" (${techToAction?.employee_id})? Portal access will be restored immediately.`}
      />

      {/* REJECT REASON MODAL */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Technician Application">
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Please enter a documented reason for rejecting the application for <span className="font-bold text-white">{techToAction?.full_name}</span>:
          </p>
          <textarea
            rows={3}
            value={modalReason}
            onChange={(e) => setModalReason(e.target.value)}
            placeholder="e.g. Unverified Employee ID, missing credentials, or invalid contact information..."
            className="glass-input w-full rounded-xl p-3 text-xs bg-slate-950 text-white border-slate-700"
          />
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject}>Confirm Rejection</Button>
          </div>
        </div>
      </Modal>

      {/* SUSPEND REASON MODAL */}
      <Modal isOpen={suspendModalOpen} onClose={() => setSuspendModalOpen(false)} title="Suspend Technician Account Access">
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            State the administrative reason for suspending portal access for <span className="font-bold text-white">{techToAction?.full_name}</span>:
          </p>
          <textarea
            rows={3}
            value={modalReason}
            onChange={(e) => setModalReason(e.target.value)}
            placeholder="e.g. Temporary leave, administrative investigation, or policy compliance review..."
            className="glass-input w-full rounded-xl p-3 text-xs bg-slate-950 text-white border-slate-700"
          />
          <div className="flex justify-end space-x-3 pt-2">
            <Button variant="ghost" onClick={() => setSuspendModalOpen(false)}>Cancel</Button>
            <Button variant="warning" onClick={handleSuspend}>Confirm Suspension</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TechnicianApproval;
