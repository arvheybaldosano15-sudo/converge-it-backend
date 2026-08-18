import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/axios';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import {
  Clock,
  CheckCircle,
  MapPin,
  Search,
  RotateCcw,
  Eye,
  FileText,
  Filter,
  Calendar,
  Archive,
  Tag
} from 'lucide-react';

import ViewTicketModal from '../../components/technician/ViewTicketModal';
import ViewServiceReportModal from '../../components/technician/ViewServiceReportModal';

const TicketHistory = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Filters & Sorting state
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'resolved', 'closed', 'this_month'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'this_week', 'this_month'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'customer_name', 'recently_updated'
  const [page, setPage] = useState(1);

  // Modals state
  const [viewTicketId, setViewTicketId] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [reportTicket, setReportTicket] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Fetch History tickets
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tickets', { params: { page: 1, limit: 200, status: 'history' } });
      if (res.success) {
        setTickets(res.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories list for dropdown filter
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
    fetchHistory();
  }, []);

  // Compute KPI Summary Counts from real backend tickets
  const stats = useMemo(() => {
    const total = tickets.length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;
    const closed = tickets.filter(t => t.status === 'closed').length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonth = tickets.filter(t => {
      const d = t.resolved_at || t.updated_at || t.created_at;
      if (!d) return false;
      const date = new Date(d);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    return { total, resolved, closed, thisMonth };
  }, [tickets]);

  // Client-side filtering & sorting engine
  const processedTickets = useMemo(() => {
    let result = [...tickets];

    // Search filter (Ticket ID, Customer Name, Title/Subject, Category, Location)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        (t.ticket_number && t.ticket_number.toLowerCase().includes(q)) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.category_name && t.category_name.toLowerCase().includes(q)) ||
        (t.customer_address && t.customer_address.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Quick Tab Filter
    if (activeTab === 'resolved') {
      result = result.filter(t => t.status === 'resolved');
    } else if (activeTab === 'closed') {
      result = result.filter(t => t.status === 'closed');
    } else if (activeTab === 'this_month') {
      const now = new Date();
      result = result.filter(t => {
        const d = t.resolved_at || t.updated_at || t.created_at;
        if (!d) return false;
        const date = new Date(d);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });
    }

    // Status Dropdown Filter
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    // Category Dropdown Filter
    if (categoryFilter !== 'all') {
      result = result.filter(t => String(t.service_category_id || '') === String(categoryFilter) || t.category_name === categoryFilter);
    }

    // Date Dropdown Filter
    if (dateFilter !== 'all') {
      const now = new Date();
      if (dateFilter === 'today') {
        const todayStr = now.toDateString();
        result = result.filter(t => {
          const d = t.resolved_at || t.updated_at || t.created_at;
          return d && new Date(d).toDateString() === todayStr;
        });
      } else if (dateFilter === 'this_week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        result = result.filter(t => {
          const d = t.resolved_at || t.updated_at || t.created_at;
          return d && new Date(d) >= weekAgo;
        });
      } else if (dateFilter === 'this_month') {
        result = result.filter(t => {
          const d = t.resolved_at || t.updated_at || t.created_at;
          if (!d) return false;
          const date = new Date(d);
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
      }
    }

    // Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.resolved_at || b.updated_at || b.created_at) - new Date(a.resolved_at || a.updated_at || a.created_at));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.resolved_at || a.updated_at || a.created_at) - new Date(b.resolved_at || b.updated_at || b.created_at));
    } else if (sortBy === 'customer_name') {
      result.sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
    } else if (sortBy === 'recently_updated') {
      result.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    }

    return result;
  }, [tickets, search, activeTab, statusFilter, categoryFilter, dateFilter, sortBy]);

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
    setCategoryFilter('all');
    setDateFilter('all');
    setSortBy('newest');
    setPage(1);
  };

  const handleOpenView = (ticket, e) => {
    if (e) e.stopPropagation();
    setViewTicketId(ticket.id);
    setIsViewModalOpen(true);
  };

  const handleOpenReportModal = (ticket, e) => {
    if (e) e.stopPropagation();
    setReportTicket(ticket);
    setIsReportModalOpen(true);
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
      cell: (row) => {
        let loc = row.customer_address;
        if (!loc && row.description) {
          const match = row.description.match(/Address:\s*([^\n\r]+)/i);
          if (match && match[1]) loc = match[1].trim();
        }
        return (
          <div>
            <p className="font-bold text-white text-sm line-clamp-1">{row.customer_name || 'N/A'}</p>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate max-w-[180px]">{loc || 'Address on file'}</span>
            </span>
          </div>
        );
      },
    },
    {
      header: 'Service / Issue',
      cell: (row) => (
        <p className="font-bold text-white text-xs line-clamp-1 max-w-[220px]" title={row.title || row.subject}>
          {row.title || row.subject}
        </p>
      ),
    },
    {
      header: 'Category',
      cell: (row) => (
        <span className="text-xs text-slate-300 flex items-center gap-1">
          <Tag className="w-3 h-3 text-cyan-400" /> {row.category_name}
        </span>
      ),
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
          <span className="text-xs text-slate-400 font-mono">
            {dateVal ? new Date(dateVal).toLocaleDateString() : '-'}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      align: 'center',
      cell: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => handleOpenView(row, e)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all active:scale-95"
            title="View Full Ticket History & Details"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Details</span>
          </button>

          <button
            onClick={(e) => handleOpenReportModal(row, e)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all active:scale-95"
            title="View Attached Service Report"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Service Report</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl font-bold text-white font-display">Service Work Order History</h1>
        <p className="text-xs text-slate-400">Archive of resolved and closed service calls</p>
      </div>

      {/* ── 1. COMPACT KPI SUMMARY INDICATORS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="flex items-center space-x-3 p-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Total Completed</p>
            <h3 className="text-xl font-extrabold text-white font-display">{stats.total}</h3>
          </div>
        </Card>

        <Card className="flex items-center space-x-3 p-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Resolved Calls</p>
            <h3 className="text-xl font-extrabold text-white font-display">{stats.resolved}</h3>
          </div>
        </Card>

        <Card className="flex items-center space-x-3 p-3.5">
          <div className="p-2.5 rounded-xl bg-slate-500/20 text-slate-300 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Closed Calls</p>
            <h3 className="text-xl font-extrabold text-white font-display">{stats.closed}</h3>
          </div>
        </Card>

        <Card className="flex items-center space-x-3 p-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Completed This Month</p>
            <h3 className="text-xl font-extrabold text-white font-display">{stats.thisMonth}</h3>
          </div>
        </Card>
      </div>

      {/* ── 2. QUICK FILTER TABS ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { key: 'all', label: 'All History' },
          { key: 'resolved', label: 'Resolved Calls' },
          { key: 'closed', label: 'Closed Calls' },
          { key: 'this_month', label: 'Completed This Month' },
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">History Search & Filter Engine</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
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
              placeholder="Search ID, customer, title, location..."
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
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="glass-input w-full py-2 px-2.5 text-xs rounded-xl bg-slate-900 text-white"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="glass-input w-full py-2 px-2.5 text-xs rounded-xl bg-slate-900 text-cyan-300 font-semibold"
          >
            <option value="newest">📅 Newest Completed</option>
            <option value="oldest">⏳ Oldest Completed</option>
            <option value="customer_name">👤 Customer Name</option>
            <option value="recently_updated">🔄 Recently Updated</option>
          </select>
        </div>

        {/* Date Filter & Reset bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Completion Date:</span>
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="glass-input py-1 px-2.5 text-xs rounded-lg bg-slate-900 text-white"
            >
              <option value="all">All Time</option>
              <option value="today">Completed Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
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

      {/* ── 4. DESKTOP DATA TABLE ── */}
      <div className="hidden sm:block">
        <DataTable
          columns={columns}
          data={paginatedTickets}
          isLoading={loading}
          onRowClick={(row) => handleOpenView(row)}
          emptyMessage="No service history found matching your filter criteria."
        />
      </div>

      {/* ── 5. MOBILE RESPONSIVE STACKED CARDS ── */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader text="Loading history..." />
          </div>
        ) : paginatedTickets.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-xs text-slate-400">
            No service history found matching your filter criteria.
          </div>
        ) : (
          paginatedTickets.map((t) => (
            <div
              key={t.id}
              onClick={(e) => handleOpenView(t, e)}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5 active:bg-slate-800/80 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                  {t.ticket_number}
                </span>
                <Badge variant={t.status === 'closed' ? 'default' : 'success'}>
                  {t.status === 'closed' ? 'Closed' : 'Resolved'}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{t.customer_name || 'N/A'}</h4>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.title || t.subject}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">{t.customer_address || 'Address on file'}</span>
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-[11px] text-slate-400 font-mono">
                  🗓️ {new Date(t.resolved_at || t.updated_at || t.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={(e) => handleOpenView(t, e)} icon={Eye}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => handleOpenReportModal(t, e)} icon={FileText}>
                    Report
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} itemsPerPage={itemsPerPage} onPageChange={setPage} />

      {/* ── 6. MODALS INTEGRATED ── */}
      <ViewTicketModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        ticketId={viewTicketId}
      />

      <ViewServiceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        ticketId={reportTicket?.id}
        ticket={reportTicket}
      />
    </div>
  );
};

export default TicketHistory;
