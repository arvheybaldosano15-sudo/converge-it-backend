import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../utils/axios';
import { getUploadUrl } from '../../utils/urlHelper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import Loader from '../../components/common/Loader';
import {
  Ticket, Filter, UserCheck, Clock, CheckCircle, AlertTriangle,
  Eye, Trash2, Edit3, MessageSquare, FileText, Camera,
  RefreshCw, Search, ShieldAlert, AlertCircle, ArrowUpDown, MoreVertical,
  UserX, ShieldCheck, CheckSquare, Layers, Send, ChevronDown
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const TicketManagement = () => {
  const { searchQuery: globalSearch } = useOutletContext() || {};
  const socketContext = useSocket();
  const socket = socketContext?.socket;

  // Data States
  const [tickets, setTickets] = useState([]);
  const [ticketStats, setTicketStats] = useState({});
  const [technicians, setTechnicians] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [slaFilter, setSlaFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals & Drawers
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [activeActionMenu, setActiveActionMenu] = useState(null);

  // Workflow Action States in Modal
  const [noteText, setNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [modalAssignee, setModalAssignee] = useState('');
  const [modalStatus, setModalStatus] = useState('');

  const activeSearch = localSearch || globalSearch || '';

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        assignedTo: assigneeFilter,
        slaStatus: slaFilter,
        search: activeSearch,
        sortBy,
        sortOrder,
      };
      const [ticketsRes, statsRes] = await Promise.all([
        api.get('/tickets', { params }),
        api.get('/tickets/stats'),
      ]);

      if (ticketsRes.success) {
        setTickets(ticketsRes.data || []);
        setTotalPages(ticketsRes.pagination?.totalPages || 1);
        setTotalItems(ticketsRes.pagination?.total || 0);
      }
      if (statsRes.success) {
        setTicketStats(statsRes.data || {});
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [techRes, catRes] = await Promise.all([
        api.get('/technicians?status=active&limit=100').catch(() => null),
        api.get('/categories').catch(() => null),
      ]);
      if (techRes && techRes.success) setTechnicians(techRes.data || []);
      if (catRes && catRes.success && catRes.data && catRes.data.length > 0) {
        setCategories(catRes.data);
      } else {
        setCategories([
          { id: 'starlink', name: 'Starlink Internet' },
          { id: 'installation', name: 'Installation Request' },
          { id: 'cctv', name: 'CCTV System' },
          { id: 'smart_devices', name: 'Smart Devices' },
          { id: 'network', name: 'Network Issues' },
          { id: 'hardware', name: 'Hardware Support' }
        ]);
      }
    } catch (e) {
      console.warn('Auxiliary data fetch error:', e);
    }
  };

  useEffect(() => {
    fetchAuxiliaryData();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter, priorityFilter, categoryFilter, assigneeFilter, slaFilter, activeSearch, sortBy, sortOrder]);

  // Real-time socket event listener
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleUpdate = () => {
      fetchTickets();
      if (selectedTicket) {
        refreshTicketDetail(selectedTicket.id);
      }
    };

    socket.on('ticket:created', handleUpdate);
    socket.on('ticket_created', handleUpdate);
    socket.on('ticket:updated', handleUpdate);
    socket.on('ticket_updated', handleUpdate);

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('ticket:created', handleUpdate);
        socket.off('ticket_created', handleUpdate);
        socket.off('ticket:updated', handleUpdate);
        socket.off('ticket_updated', handleUpdate);
      }
    };
  }, [socket, selectedTicket]);

  const refreshTicketDetail = async (ticketId) => {
    try {
      const res = await api.get(`/tickets/${ticketId}`);
      if (res.success) {
        setSelectedTicket(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetFilters = () => {
    setLocalSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setAssigneeFilter('');
    setSlaFilter('');
    setSortBy('created_at');
    setSortOrder('DESC');
    setPage(1);
  };

  const handleAssignTechnician = async (ticketId, technicianId) => {
    try {
      const res = await api.put(`/tickets/${ticketId}`, { assignedTo: technicianId });
      if (res.success) {
        toast.success('Technician assigned successfully');
        fetchTickets();
        if (selectedTicket && selectedTicket.id === ticketId) {
          refreshTicketDetail(ticketId);
        }
      }
    } catch (err) {
      toast.error('Failed to assign technician');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const res = await api.put(`/tickets/${ticketId}`, { status: newStatus });
      if (res.success) {
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
        fetchTickets();
        if (selectedTicket && selectedTicket.id === ticketId) {
          refreshTicketDetail(ticketId);
        }
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !selectedTicket) return;
    setIsSubmittingNote(true);
    try {
      const res = await api.put(`/tickets/${selectedTicket.id}`, { note: noteText });
      if (res.success) {
        toast.success('Internal note added');
        setNoteText('');
        refreshTicketDetail(selectedTicket.id);
        fetchTickets();
      }
    } catch (err) {
      toast.error('Failed to add note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    try {
      const res = await api.delete(`/tickets/${ticketToDelete.id}`);
      if (res.success) {
        toast.success('Ticket deleted successfully');
        setIsDeleteConfirmOpen(false);
        setTicketToDelete(null);
        fetchTickets();
      }
    } catch (err) {
      toast.error('Failed to delete ticket');
    }
  };

  const viewTicketDetail = async (ticket) => {
    setSelectedTicket(ticket);
    setModalAssignee(ticket.assigned_to || ticket.assigned_technician_id || '');
    setModalStatus(ticket.status || 'open');
    setIsDetailModalOpen(true);
    refreshTicketDetail(ticket.id);
  };

  // Summary KPI Cards data
  const summaryCards = [
    { label: 'Total Tickets', count: parseInt(ticketStats.total) || 0, icon: Ticket, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500', active: !statusFilter && !slaFilter, onClick: () => resetFilters() },
    { label: 'Open', count: parseInt(ticketStats.open_count) || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500', active: statusFilter === 'open', onClick: () => { setStatusFilter('open'); setSlaFilter(''); setPage(1); } },
    { label: 'In Progress', count: parseInt(ticketStats.in_progress_count) || 0, icon: UserCheck, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500', active: statusFilter === 'in_progress', onClick: () => { setStatusFilter('in_progress'); setSlaFilter(''); setPage(1); } },
    { label: 'Resolved', count: parseInt(ticketStats.resolved_count) || 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500', active: statusFilter === 'resolved', onClick: () => { setStatusFilter('resolved'); setSlaFilter(''); setPage(1); } },
    { label: 'SLA At Risk', count: parseInt(ticketStats.sla_at_risk) || 0, icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500', active: slaFilter === 'at_risk', onClick: () => { setSlaFilter('at_risk'); setStatusFilter(''); setPage(1); } },
    { label: 'SLA Breached', count: parseInt(ticketStats.sla_breached) || 0, icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500', active: slaFilter === 'breached', onClick: () => { setSlaFilter('breached'); setStatusFilter(''); setPage(1); } },
  ];

  // Calculate SLA Status Helper
  const getSlaStatus = (slaDeadline, status) => {
    if (['resolved', 'closed'].includes(status)) {
      return { text: 'RESOLVED', variant: 'success', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' };
    }
    if (!slaDeadline) {
      return { text: 'WITHIN SLA', variant: 'success', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' };
    }

    const now = new Date();
    const deadline = new Date(slaDeadline);
    const diffMs = deadline - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs < 0) {
      const overHours = Math.abs(Math.floor(diffHours));
      return { text: 'BREACHED', desc: `${overHours}h overdue`, variant: 'danger', color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40' };
    } else if (diffHours <= 4) {
      const remHours = Math.max(1, Math.floor(diffHours));
      return { text: 'AT RISK', desc: `${remHours}h left`, variant: 'warning', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40' };
    } else {
      const remHours = Math.floor(diffHours);
      return { text: 'WITHIN SLA', desc: `${remHours}h remaining`, variant: 'success', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Support Ticket Management</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              AUTO SYSTEM TICKETS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Search, monitor, prioritize, assign and track tickets</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchTickets} icon={RefreshCw} className="text-slate-400 hover:text-white">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* 6 Clickable Compact Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card
              key={idx}
              onClick={card.onClick}
              className={`flex items-center gap-3 p-3 transition-all duration-200 border-l-4 border-t-0 border-r-0 border-b-0 ${card.border} ${
                card.active ? 'bg-slate-800/90 ring-1 ring-cyan-500/50 brightness-110' : 'bg-slate-900/70 hover:bg-slate-800/60'
              } cursor-pointer`}
            >
              <div className={`p-2 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-lg font-extrabold font-display leading-none ${card.color}`}>{card.count}</h3>
                <p className="text-[11px] font-bold text-slate-200 mt-0.5 truncate">{card.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Enhanced Filter Bar */}
      <Card className="p-4 space-y-3 bg-slate-950/70 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span>Search & Filter Engine</span>
          </div>
          {(statusFilter || priorityFilter || categoryFilter || assigneeFilter || slaFilter || activeSearch || sortBy !== 'created_at') && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-rose-400 hover:text-rose-300">
              Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Ticket ID, Customer, Title..."
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
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* SLA Filter */}
          <select
            value={slaFilter}
            onChange={(e) => { setSlaFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="">All SLA Statuses</option>
            <option value="within">Within SLA</option>
            <option value="at_risk">At Risk (&lt; 4h)</option>
            <option value="breached">SLA Breached</option>
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
              Newest
            </button>
            <button
              onClick={() => setSortBy('priority')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'priority' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'}`}
            >
              Priority
            </button>
            <button
              onClick={() => setSortBy('sla_deadline')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'sla_deadline' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'}`}
            >
              SLA Target
            </button>
            <button
              onClick={() => setSortBy('updated_at')}
              className={`px-2 py-1 rounded-lg transition-colors ${sortBy === 'updated_at' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:text-white'}`}
            >
              Recently Updated
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1"
            >
              Order: <span className="font-bold text-cyan-400">{sortOrder}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Main Ticket Table */}
      <Card className="p-0 overflow-hidden border-slate-800 bg-slate-950/80">
        <div className="overflow-x-auto lg:overflow-x-visible">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-2.5 sm:p-3">Ticket ID</th>
                <th className="p-2.5 sm:p-3">Customer</th>
                <th className="p-2.5 sm:p-3">Category</th>
                <th className="p-2.5 sm:p-3">Priority</th>
                <th className="p-2.5 sm:p-3">Status</th>
                <th className="p-2.5 sm:p-3">Assignee</th>
                <th className="p-2.5 sm:p-3">SLA Status</th>
                <th className="p-2.5 sm:p-3">Created Date</th>
                <th className="p-2.5 sm:p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center">
                    <Loader text="Fetching system support tickets..." />
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-500">
                    <p className="text-sm font-semibold text-slate-400">No support tickets found matching current filters.</p>
                    <p className="text-xs text-slate-500 mt-1">Try resetting search filters or checking Botcake integration.</p>
                  </td>
                </tr>
              ) : (
                tickets.map((row) => {
                  const slaInfo = getSlaStatus(row.sla_deadline, row.status);

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-900/70 transition-colors"
                    >
                      {/* Ticket Number */}
                      <td className="p-2.5 sm:p-3 font-mono font-extrabold text-cyan-400">
                        {row.ticket_number}
                      </td>

                      {/* Customer Details */}
                      <td className="p-2.5 sm:p-3">
                        <p className="font-bold text-white truncate max-w-[130px]">{row.customer_name || 'Customer'}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{row.customer_contact || row.subject}</p>
                      </td>

                      {/* Category */}
                      <td className="p-2.5 sm:p-3">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium">
                          {row.category_name || 'General Support'}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="p-2.5 sm:p-3">
                        <Badge variant={row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warning' : row.priority === 'medium' ? 'cyan' : 'default'}>
                          {row.priority}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="p-2.5 sm:p-3">
                        <Badge variant={
                          row.status === 'resolved' ? 'success' :
                          row.status === 'in_progress' ? 'info' :
                          row.status === 'open' ? 'warning' :
                          row.status === 'closed' ? 'secondary' : 'danger'
                        } className="capitalize">
                          {row.status ? row.status.replace('_', ' ') : 'open'}
                        </Badge>
                      </td>

                      {/* Assignee */}
                      <td className="p-2.5 sm:p-3" onClick={(e) => e.stopPropagation()}>
                        {row.assignee_name ? (
                          <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 max-w-[130px]">
                            <UserCheck className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                            <span className="truncate font-semibold text-[11px]">{row.assignee_name}</span>
                          </div>
                        ) : (
                          <select
                            value={row.assigned_to || ''}
                            onChange={(e) => handleAssignTechnician(row.id, e.target.value)}
                            className="glass-input text-[11px] rounded-lg py-1 px-2 border-slate-700 bg-slate-900 text-purple-400 font-semibold max-w-[130px]"
                          >
                            <option value="">Select Tech...</option>
                            {technicians.map((t) => (
                              <option key={t.id} value={t.id}>{t.full_name}</option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* SLA Status */}
                      <td className="p-2.5 sm:p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${slaInfo.bg} ${slaInfo.color} ${slaInfo.border}`}>
                          {slaInfo.text}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="p-2.5 sm:p-3 text-slate-400 text-[11px]">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 sm:p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => viewTicketDetail(row)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 hover:text-cyan-300"
                            title="View Ticket Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setActiveActionMenu(activeActionMenu === row.id ? null : row.id)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeActionMenu === row.id && (
                              <div className="absolute right-0 mt-1 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-20 py-1 text-xs">
                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    viewTicketDetail(row);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-cyan-400" /> View Details
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    setTicketToDelete(row);
                                    setIsDeleteConfirmOpen(true);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rose-500/20 text-rose-400 flex items-center gap-2 border-t border-slate-800 mt-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Delete Ticket
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <p className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{tickets.length > 0 ? (page - 1) * 10 + 1 : 0}</span> to{' '}
          <span className="font-bold text-white">{Math.min(page * 10, totalItems)}</span> of{' '}
          <span className="font-bold text-cyan-400">{totalItems}</span> automatically generated tickets
        </p>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={10}
          onPageChange={setPage}
        />
      </div>

      {/* MODERN GLASSMORPHISM TICKET DETAILS MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title=""
        maxWidth="max-w-4xl"
      >
        {selectedTicket && (
          <div className="space-y-6">
            {/* Ticket Header & Status Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-extrabold text-cyan-400">{selectedTicket.ticket_number}</span>
                  <Badge variant={selectedTicket.priority === 'critical' ? 'danger' : selectedTicket.priority === 'high' ? 'warning' : 'cyan'}>
                    {selectedTicket.priority} Priority
                  </Badge>
                  <Badge variant={selectedTicket.status === 'resolved' ? 'success' : selectedTicket.status === 'in_progress' ? 'info' : 'warning'}>
                    {selectedTicket.status ? selectedTicket.status.replace('_', ' ') : 'open'}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-white mt-1 font-display">{selectedTicket.subject || selectedTicket.title}</h3>
              </div>

              {/* SLA Target Badge */}
              <div className="shrink-0 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SLA Compliance Target</span>
                {(() => {
                  const sla = getSlaStatus(selectedTicket.sla_deadline, selectedTicket.status);
                  return (
                    <div className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${sla.bg} ${sla.color} ${sla.border}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{sla.text} ({sla.desc || 'Active Target'})</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Customer Information & Ticket Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Box */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block border-b border-slate-800 pb-1">
                  Customer Profile & Address
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{selectedTicket.customer_name || 'N/A'}</p>
                  <p className="text-slate-300 mt-0.5">📞 Contact: <strong className="text-white">{selectedTicket.customer_contact || 'Not specified'}</strong></p>
                  <p className="text-slate-300 mt-0.5">📍 Address: <strong className="text-white">{selectedTicket.customer_address || 'Address provided in concern'}</strong></p>
                  {selectedTicket.messenger_psid && (
                    <p className="text-slate-400 text-[10px] mt-1 font-mono">Messenger PSID: {selectedTicket.messenger_psid}</p>
                  )}
                </div>
              </div>

              {/* Ticket Metadata Box */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block border-b border-slate-800 pb-1">
                  Service Category & Assignment
                </span>
                <div className="space-y-1.5">
                  <p className="text-slate-300">Category: <strong className="text-white">{selectedTicket.category_name || 'General Technical Support'}</strong></p>
                  <p className="text-slate-300">Assigned Technician: <strong className="text-indigo-300">{selectedTicket.assignee_name || 'Unassigned'}</strong></p>
                  <p className="text-slate-300">Created Date: <strong className="text-white">{new Date(selectedTicket.created_at).toLocaleString()}</strong></p>
                  <p className="text-slate-300">SLA Target Deadline: <strong className="text-amber-300">{selectedTicket.sla_deadline ? new Date(selectedTicket.sla_deadline).toLocaleString() : 'N/A'}</strong></p>
                </div>
              </div>
            </div>

            {/* Concern Description */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detailed Concern Description</span>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedTicket.description}
              </div>
            </div>



            {/* Field Service Report (if available) */}
            {selectedTicket.serviceReport && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                    <FileText className="w-4 h-4" />
                    <span>Field Technician Service Completion Report</span>
                  </div>
                  <Badge variant="success">Report Submitted</Badge>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Work Performed</span>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-950/60 p-3 rounded-lg border border-slate-800 mt-1">
                    {selectedTicket.serviceReport.work_performed}
                  </p>
                </div>

                {selectedTicket.serviceReport.materials_used && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Materials Used</span>
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800 mt-1">
                      {selectedTicket.serviceReport.materials_used}
                    </p>
                  </div>
                )}

                {/* Proof Photos */}
                {selectedTicket.serviceReport.images_urls && selectedTicket.serviceReport.images_urls.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-blue-400" /> Installation Photos ({selectedTicket.serviceReport.images_urls.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                      {selectedTicket.serviceReport.images_urls.map((url, i) => (
                        <a key={i} href={getUploadUrl(url)} target="_blank" rel="noopener noreferrer" className="rounded-xl overflow-hidden border border-slate-800 aspect-video block">
                          <img
                            src={getUploadUrl(url)}
                            alt={`Photo ${i + 1}`}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://placehold.co/600x400/0f172a/38bdf8?text=Photo+Unavailable';
                            }}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PROFESSIONAL TICKET ACTIVITY TIMELINE */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-white font-display block">Professional Activity & Update Timeline</span>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {/* Automatic Ticket Creation Entry */}
                <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 mt-0.5">
                    <Ticket className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-200 font-semibold">
                      Automatic Ticket Created via <span className="text-cyan-400">Messenger Integration</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Ticket Updates Array */}
                {selectedTicket.updates && selectedTicket.updates.map((up, i) => (
                  <div key={i} className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-200">
                        <strong className="text-white">{up.user_name || 'System User'}</strong> updated status to{' '}
                        <Badge variant="cyan" className="capitalize">{up.status_changed_to ? up.status_changed_to.replace('_', ' ') : 'updated'}</Badge>
                      </p>
                      {up.notes && <p className="text-slate-300 mt-1 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800">{up.notes}</p>}
                      <p className="text-[10px] text-slate-500 mt-1">{new Date(up.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Internal Note Form */}
              <form onSubmit={handleAddNote} className="flex gap-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="Add internal note or technician update..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="glass-input flex-1 text-xs rounded-xl py-2 px-3 border-slate-700 bg-slate-950 text-white"
                />
                <Button type="submit" variant="primary" size="sm" disabled={isSubmittingNote} icon={Send}>
                  Add Note
                </Button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteTicket}
        title="Delete Support Ticket"
        message={`Are you sure you want to permanently delete ticket ${ticketToDelete?.ticket_number}? This action cannot be undone.`}
      />
    </div>
  );
};

export default TicketManagement;
