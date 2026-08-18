import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Search,
  RotateCcw,
  Eye,
  Edit,
  FileText,
  Filter,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';

import { useTickets } from '../../hooks/useTickets';
import { useTechDashboard } from '../../hooks/useDashboard';
import ViewTicketModal from '../../components/technician/ViewTicketModal';
import UpdateTicketModal from '../../components/technician/UpdateTicketModal';
import FileServiceReportModal from '../../components/technician/FileServiceReportModal';

// Helper for live SLA countdown calculation
const getSlaInfo = (deadlineStr, status) => {
  if (status === 'resolved' || status === 'closed') {
    return { text: 'Resolved', isBreached: false, isUrgent: false, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  }
  if (!deadlineStr) {
    return { text: 'No Target Set', isBreached: false, isUrgent: false, colorClass: 'text-slate-400 bg-slate-800/50 border-slate-700/50' };
  }

  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline - now;

  if (diffMs <= 0) {
    return { text: 'SLA Breached', isBreached: true, isUrgent: true, colorClass: 'text-rose-400 bg-rose-500/15 border-rose-500/40 animate-pulse' };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const text = hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`;
  const isUrgent = hours < 4;

  const colorClass = isUrgent
    ? 'text-amber-400 bg-amber-500/15 border-amber-500/40'
    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';

  return { text, isBreached: false, isUrgent, colorClass };
};

const AssignedTickets = () => {
  const queryClient = useQueryClient();

  // Summary stats from dashboard endpoint
  const { data: dashboardData } = useTechDashboard();
  const dashStats = dashboardData?.stats || {};
  const completedTodayCount = dashboardData?.completedToday || 0;

  // Filter & Search state
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'in_progress', 'urgent', 'completed', 'closed'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  const [sortBy, setSortBy] = useState('smart'); // 'smart', 'sla_deadline', 'priority', 'created_at', 'updated_at'
  const [page, setPage] = useState(1);

  // Categories list for dropdown filter
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        if (res.success) setCategories(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCats();
  }, []);

  // Modal State
  const [viewTicketId, setViewTicketId] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [updateTicket, setUpdateTicket] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const [reportTicket, setReportTicket] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Query Backend tickets (limit 100 to allow rich client-side smart sorting & tabs)
  const { data: ticketsData, isLoading: loading } = useTickets({
    limit: 100,
    search: search ? search : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  const rawTickets = ticketsData?.data || ticketsData || [];

  // Client-side filtering & smart sorting
  const processedTickets = useMemo(() => {
    let result = [...rawTickets];

    // Filter by Quick Tab
    if (activeTab === 'pending') {
      result = result.filter(t => t.status === 'open');
    } else if (activeTab === 'in_progress') {
      result = result.filter(t => t.status === 'in_progress');
    } else if (activeTab === 'urgent') {
      result = result.filter(t => t.priority === 'critical' || t.priority === 'high');
    } else if (activeTab === 'completed') {
      result = result.filter(t => t.status === 'resolved' || t.status === 'closed');
    } else if (activeTab === 'closed') {
      result = result.filter(t => t.status === 'closed');
    }

    // Filter by SLA status dropdown
    if (slaFilter === 'breached') {
      result = result.filter(t => t.sla_deadline && new Date(t.sla_deadline) < new Date() && t.status !== 'resolved' && t.status !== 'closed');
    } else if (slaFilter === 'at_risk') {
      result = result.filter(t => {
        if (!t.sla_deadline || t.status === 'resolved' || t.status === 'closed') return false;
        const diffHours = (new Date(t.sla_deadline) - new Date()) / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 4;
      });
    } else if (slaFilter === 'within') {
      result = result.filter(t => {
        if (t.status === 'resolved' || t.status === 'closed') return true;
        if (!t.sla_deadline) return true;
        const diffHours = (new Date(t.sla_deadline) - new Date()) / (1000 * 60 * 60);
        return diffHours > 4;
      });
    }

    // Sorting
    if (sortBy === 'smart') {
      // Smart priority: active tickets first (In Progress -> Pending -> Resolved -> Closed), then Priority (Critical -> High -> Medium -> Low), then SLA Deadline ASC
      result.sort((a, b) => {
        const statusOrder = { in_progress: 1, open: 2, resolved: 3, closed: 4 };
        const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };

        const sA = statusOrder[a.status] || 5;
        const sB = statusOrder[b.status] || 5;
        if (sA !== sB) return sA - sB;

        const pA = priorityOrder[a.priority] || 5;
        const pB = priorityOrder[b.priority] || 5;
        if (pA !== pB) return pA - pB;

        if (a.sla_deadline && b.sla_deadline) {
          return new Date(a.sla_deadline) - new Date(b.sla_deadline);
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else if (sortBy === 'sla_deadline') {
      result.sort((a, b) => (new Date(a.sla_deadline || 0) - new Date(b.sla_deadline || 0)));
    } else if (sortBy === 'priority') {
      const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
      result.sort((a, b) => (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5));
    } else if (sortBy === 'created_at') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'updated_at') {
      result.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    }

    return result;
  }, [rawTickets, activeTab, slaFilter, sortBy]);

  // Client-side pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(processedTickets.length / itemsPerPage) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return processedTickets.slice(start, start + itemsPerPage);
  }, [processedTickets, page]);

  const handleResetFilters = () => {
    setActiveTab('all');
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setSlaFilter('all');
    setSortBy('smart');
    setPage(1);
  };

  const handleOpenView = (ticket, e) => {
    if (e) e.stopPropagation();
    setViewTicketId(ticket.id);
    setIsViewModalOpen(true);
  };

  const handleOpenUpdate = (ticket, e) => {
    if (e) e.stopPropagation();
    setUpdateTicket(ticket);
    setIsUpdateModalOpen(true);
  };

  const handleOpenFileReport = (ticket, e) => {
    if (e) e.stopPropagation();
    setReportTicket(ticket);
    setIsReportModalOpen(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'technician'] });
  };

  const columns = [
    {
      header: 'Ticket ID',
      cell: (row) => (
        <span className="font-mono text-xs font-extrabold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
          {row.ticket_number}
        </span>
      ),
    },
    {
      header: 'Customer',
      cell: (row) => (
        <div>
          <p className="font-bold text-white text-sm line-clamp-1">{row.customer_name || 'N/A'}</p>
          <span className="text-[11px] text-slate-400">{row.category_name}</span>
        </div>
      ),
    },
    {
      header: 'Location',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300 max-w-[200px]">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate" title={row.customer_address}>{row.customer_address || 'Address on file'}</span>
        </div>
      ),
    },
    {
      header: 'Priority',
      align: 'center',
      cell: (row) => (
        <Badge variant={row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warning' : 'cyan'}>
          {row.priority}
        </Badge>
      ),
    },
    {
      header: 'SLA Status',
      align: 'center',
      cell: (row) => {
        const slaInfo = getSlaInfo(row.sla_deadline, row.status);
        return (
          <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border ${slaInfo.colorClass}`}>
            ⏰ {slaInfo.text}
          </span>
        );
      },
    },
    {
      header: 'Status',
      align: 'center',
      cell: (row) => {
        const variantMap = {
          open: 'warning',
          in_progress: 'primary',
          resolved: 'success',
          closed: 'default'
        };
        const displayStatus = row.status === 'open' ? 'pending' : row.status;
        return (
          <Badge variant={variantMap[row.status] || 'default'} className="capitalize">
            {displayStatus ? displayStatus.replace('_', ' ') : ''}
          </Badge>
        );
      },
    },
    {
      header: 'Assigned Date',
      align: 'center',
      cell: (row) => (
        <span className="text-xs text-slate-400">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'center',
      cell: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => handleOpenView(row, e)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all active:scale-95"
            title="View Ticket Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View</span>
          </button>
          <button
            onClick={(e) => handleOpenUpdate(row, e)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-all active:scale-95"
            title="Update Status"
          >
            <Edit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Update</span>
          </button>
          <button
            onClick={(e) => handleOpenFileReport(row, e)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all active:scale-95"
            title="File Service Report"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Assigned Support Tasks</h1>
        <p className="text-xs text-slate-400">Field work orders assigned to you</p>
      </div>

      {/* ── 1. COMPACT KPI SUMMARY INDICATORS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="flex items-center space-x-3 p-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Total Assigned</p>
            <h3 className="text-xl font-extrabold text-white font-display">{dashStats.total_assigned || rawTickets.length}</h3>
          </div>
        </Card>

        <Card className="flex items-center space-x-3 p-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Pending</p>
            <h3 className="text-xl font-extrabold text-white font-display">{dashStats.open_tickets || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center space-x-3 p-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">In Progress</p>
            <h3 className="text-xl font-extrabold text-white font-display">{dashStats.in_progress_tickets || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center space-x-3 p-3.5">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Urgent / High</p>
            <h3 className="text-xl font-extrabold text-white font-display">{dashStats.urgent_tickets || 0}</h3>
          </div>
        </Card>

        <Card className="flex items-center space-x-3 p-3.5 col-span-2 lg:col-span-1">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Completed</p>
            <h3 className="text-xl font-extrabold text-white font-display">{dashStats.completed_tickets || 0}</h3>
          </div>
        </Card>
      </div>

      {/* ── 2. QUICK FILTER TABS ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { key: 'all', label: 'All Tasks' },
          { key: 'pending', label: 'Pending' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'urgent', label: 'Urgent / High' },
          { key: 'completed', label: 'Completed' },
          { key: 'closed', label: 'Closed' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === tab.key
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 3. SEARCH, FILTERS & SORTING ENGINE ── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <Filter className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Filter & Sorting Engine</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID, customer, title..."
              className="glass-input w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 text-white"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="glass-input w-full py-2 px-2.5 text-xs rounded-xl bg-slate-900 text-white"
          >
            <option value="all">All Statuses</option>
            <option value="open">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="glass-input w-full py-2 px-2.5 text-xs rounded-xl bg-slate-900 text-white"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical Priority</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* SLA Status Dropdown */}
          <select
            value={slaFilter}
            onChange={(e) => { setSlaFilter(e.target.value); setPage(1); }}
            className="glass-input w-full py-2 px-2.5 text-xs rounded-xl bg-slate-900 text-white"
          >
            <option value="all">All SLA Statuses</option>
            <option value="breached">SLA Breached</option>
            <option value="at_risk">At Risk (≤ 4h)</option>
            <option value="within">Within SLA</option>
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="glass-input w-full py-2 px-2.5 text-xs rounded-xl bg-slate-900 text-cyan-300 font-semibold"
          >
            <option value="smart">⚡ Smart Priority & SLA</option>
            <option value="sla_deadline">⏰ SLA Deadline</option>
            <option value="priority">🔥 Priority Level</option>
            <option value="created_at">📅 Assigned Date</option>
            <option value="updated_at">🔄 Recently Updated</option>
          </select>
        </div>

        {/* Category & Reset bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="glass-input py-1 px-2.5 text-xs rounded-lg bg-slate-900 text-white min-w-[140px]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset Filters
          </button>
        </div>
      </Card>

      {/* ── 4. DATA TABLE ── */}
      <DataTable
        columns={columns}
        data={paginatedTickets}
        isLoading={loading}
        onRowClick={(row) => handleOpenView(row)}
        emptyMessage="No assigned tickets found matching your filter criteria."
      />

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={itemsPerPage} onPageChange={setPage} />

      {/* ── 5. ALL MODALS INTEGRATED ── */}
      <ViewTicketModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        ticketId={viewTicketId}
        onOpenUpdateModal={handleOpenUpdate}
        onOpenFileServiceReport={handleOpenFileReport}
      />

      <UpdateTicketModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        ticket={updateTicket}
        onSuccess={handleSuccess}
      />

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
