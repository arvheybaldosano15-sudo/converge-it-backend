import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../utils/axios';
import { getUploadUrl, parseImageUrls } from '../../utils/urlHelper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import Loader from '../../components/common/Loader';
import TechnicianAssignDropdown from '../../components/common/TechnicianAssignDropdown';
import {
  Ticket, Filter, UserCheck, Clock, CheckCircle, AlertTriangle,
  Eye, Trash2, Edit3, MessageSquare, FileText, Camera,
  RefreshCw, Search, ShieldAlert, AlertCircle, ArrowUpDown, MoreVertical,
  UserX, ShieldCheck, CheckSquare, Layers, Send, ChevronDown,
  Maximize2, ExternalLink, X
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
  const [fullscreenImage, setFullscreenImage] = useState(null);
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

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoading(true);
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
        excludeCategoryName: 'Installation Request',
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
      if (!silent) toast.error('Failed to load support tickets');
    } finally {
      if (!silent) setLoading(false);
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

  // Fast 5-second background auto-sync polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTickets(true);
      if (selectedTicket) {
        refreshTicketDetail(selectedTicket.id);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [page, statusFilter, priorityFilter, categoryFilter, assigneeFilter, slaFilter, activeSearch, sortBy, sortOrder, selectedTicket]);

  // Real-time socket event listener
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleUpdate = () => {
      fetchTickets(true);
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
      toast.error(err.message || 'Failed to assign technician');
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
    { label: 'Pending', count: parseInt(ticketStats.open_count) || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500', active: statusFilter === 'open', onClick: () => { setStatusFilter('open'); setSlaFilter(''); setPage(1); } },
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
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="open">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="glass-input text-xs rounded-xl py-1.5 px-3 border-slate-700 bg-slate-900 text-slate-200"
          >
            <option value="">All Priorities</option>
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
            {categories.filter(c => !c.name.toLowerCase().includes('installation request')).map((c) => (
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
                      <td className="p-2.5 sm:p-3 max-w-[150px]">
                        <p className="font-bold text-white text-[13px] whitespace-normal break-words leading-tight">{row.customer_name || 'Customer'}</p>
                        <p className="text-[10px] text-slate-400 whitespace-normal break-words mt-0.5">{row.customer_contact || row.subject}</p>
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
                          {row.status ? (row.status === 'open' ? 'pending' : row.status.replace('_', ' ')) : 'pending'}
                        </Badge>
                      </td>

                      {/* Assignee */}
                      <td className="p-2.5 sm:p-3" onClick={(e) => e.stopPropagation()}>
                        {row.assignee_name ? (
                          <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 max-w-[140px]">
                            <UserCheck className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                            <span className="truncate font-semibold text-[11px]">{row.assignee_name}</span>
                          </div>
                        ) : (
                          <TechnicianAssignDropdown
                            technicians={technicians}
                            onAssign={(techId) => handleAssignTechnician(row.id, techId)}
                          />
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
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="View Ticket Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setTicketToDelete(row);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 transition-colors"
                            title="Delete Ticket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
            <div className="pb-4 border-b border-slate-800 pr-10">
              {/* Badges row — Close Ticket button is here, well clear of modal's X */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-extrabold text-cyan-400">{selectedTicket.ticket_number}</span>
                <Badge variant={selectedTicket.priority === 'critical' ? 'danger' : selectedTicket.priority === 'high' ? 'warning' : 'cyan'}>
                  {selectedTicket.priority} Priority
                </Badge>
                <Badge variant={selectedTicket.status === 'resolved' ? 'success' : selectedTicket.status === 'in_progress' ? 'info' : 'warning'}>
                  {selectedTicket.status ? (selectedTicket.status === 'open' ? 'pending' : selectedTicket.status.replace('_', ' ')) : 'pending'}
                </Badge>
                {selectedTicket.status !== 'closed' ? (
                  <button
                    onClick={() => handleStatusChange(selectedTicket.id, 'closed')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/40 hover:border-rose-400/60 transition-all active:scale-95"
                  >
                    <X className="w-3 h-3" /> Close Ticket
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/40 text-slate-500 border border-slate-700/50 italic">
                    Ticket Closed
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-white mt-1.5 font-display">{selectedTicket.subject || selectedTicket.title}</h3>

              {/* SLA Target — below title, no conflict with modal X */}
              <div className="mt-2">
                {(() => {
                  const sla = getSlaStatus(selectedTicket.sla_deadline, selectedTicket.status);
                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SLA Compliance Target:</span>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${sla.bg} ${sla.color} ${sla.border}`}>
                        <Clock className="w-3 h-3" />
                        <span>{sla.text} ({sla.desc || 'Active Target'})</span>
                      </div>
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
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 mb-1">
                    <Camera className="w-3.5 h-3.5 text-blue-400" /> Installation Photos ({parseImageUrls(selectedTicket.serviceReport.images_urls).length})
                  </span>
                  {parseImageUrls(selectedTicket.serviceReport.images_urls).length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                      {parseImageUrls(selectedTicket.serviceReport.images_urls).map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFullscreenImage(getUploadUrl(url))}
                          className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video block w-full text-left cursor-pointer transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
                        >
                          <img
                            src={getUploadUrl(url)}
                            alt={`Photo ${i + 1}`}
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%230f172a'/%3E%3Cg fill='none' stroke='%2338bdf8' stroke-width='2'%3E%3Crect x='130' y='90' width='140' height='100' rx='10'/%3E%3Ccircle cx='200' cy='140' r='25'/%3E%3C/g%3E%3Ctext x='200' y='220' fill='%2394a3b8' font-family='sans-serif' font-size='14' text-anchor='middle'%3EPhoto Unavailable%3C/text%3E%3C/svg%3E";
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-xs font-semibold bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                              <Maximize2 className="w-3.5 h-3.5 text-blue-400" /> Full Size
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                      No installation photos uploaded for this report.
                    </div>
                  )}
                </div>
              </div>
            )}


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

      {/* Fullscreen Image Lightbox Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          {/* Header controls */}
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={fullscreenImage}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-white transition-colors border border-slate-700 shadow-lg flex items-center gap-1.5 text-xs font-semibold px-3.5"
              title="Open Original Image"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" /> Open Original
            </a>
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="p-2.5 rounded-full bg-red-600/90 hover:bg-red-500 text-white transition-colors shadow-lg active:scale-95"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image Container */}
          <div className="max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreenImage}
              alt="Full Size Installation Photo"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-slate-800 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketManagement;
