import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/axios';
import { useSocket } from '../../context/SocketContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import {
  Bell,
  CheckCheck,
  Search,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  Megaphone,
  Ticket,
  Eye,
  Filter,
  Flame,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import ViewTicketModal from '../../components/technician/ViewTicketModal';

const TechnicianNotifications = () => {
  const { socket, setUnreadNotifications } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'tickets', 'sla', 'reports', 'system'
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest'

  // Modal State
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Fetch all notifications for logged-in technician
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { limit: 100 } });
      if (res.success && res.data) {
        setNotifications(res.data);
        const unreadCount = res.data.filter((n) => !n.is_read).length;
        setUnreadNotifications(unreadCount);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load task alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen to real-time socket events for new notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadNotifications((prev) => prev + 1);
    };

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, setUnreadNotifications]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotifications(0);
      toast.success('All task alerts marked as read');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update notifications');
    }
  };

  // Mark a single notification as read
  const handleMarkSingleRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadNotifications((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  // Delete / Dismiss a single notification
  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.is_read) {
        setUnreadNotifications((prev) => Math.max(0, prev - 1));
      }
      toast.success('Alert dismissed');
    } catch (e) {
      console.error(e);
      toast.error('Failed to dismiss alert');
    }
  };

  // Click on a notification card
  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      handleMarkSingleRead(notif.id);
    }
    if (notif.reference_id) {
      setSelectedTicketId(notif.reference_id);
      setIsViewModalOpen(true);
    }
  };

  // Client-side Filter & Search engine
  const filteredNotifications = useMemo(() => {
    let list = [...notifications];

    // Search Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.message && n.message.toLowerCase().includes(q)) ||
          (n.reference_id && n.reference_id.toLowerCase().includes(q))
      );
    }

    // Tab Filter
    if (activeTab === 'unread') {
      list = list.filter((n) => !n.is_read);
    } else if (activeTab === 'tickets') {
      list = list.filter(
        (n) =>
          n.type?.includes('ticket') ||
          n.type?.includes('assign') ||
          n.type?.includes('priority') ||
          n.type?.includes('reassign')
      );
    } else if (activeTab === 'sla') {
      list = list.filter((n) => n.type?.includes('sla') || n.type?.includes('deadline'));
    } else if (activeTab === 'reports') {
      list = list.filter((n) => n.type?.includes('report') || n.type?.includes('service'));
    } else if (activeTab === 'system') {
      list = list.filter(
        (n) =>
          n.type === 'system' ||
          n.type === 'announcement' ||
          !n.reference_id
      );
    }

    // Sorting
    if (sortOrder === 'newest') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortOrder === 'oldest') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return list;
  }, [notifications, search, activeTab, sortOrder]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  // Helper for notification type icons & badges
  const getNotificationIcon = (type = '', title = '') => {
    const lowerType = (type + ' ' + title).toLowerCase();
    if (lowerType.includes('urgent') || lowerType.includes('critical') || lowerType.includes('high')) {
      return { icon: Flame, colorClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    }
    if (lowerType.includes('sla') || lowerType.includes('deadline') || lowerType.includes('breach')) {
      return { icon: Clock, colorClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    }
    if (lowerType.includes('report') || lowerType.includes('service')) {
      return { icon: FileText, colorClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    }
    if (lowerType.includes('assign') || lowerType.includes('ticket')) {
      return { icon: Ticket, colorClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    }
    return { icon: Megaphone, colorClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-white font-display">Technician Task Alerts</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-extrabold animate-pulse">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Work assignments, approval status, and urgency notifications
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            icon={CheckCheck}
            className="self-start sm:self-auto"
          >
            Mark All Read
          </Button>
        )}
      </div>

      {/* ── QUICK FILTER TABS ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { key: 'all', label: 'All Alerts' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'tickets', label: 'Work Orders' },
          { key: 'sla', label: 'SLA & Deadlines' },
          { key: 'reports', label: 'Service Reports' },
          { key: 'system', label: 'System' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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

      {/* ── SEARCH & SORT BAR ── */}
      <Card className="p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alert title, message, or Ticket ID..."
              className="glass-input w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 text-white"
            />
          </div>

          {/* Sort Dropdown & Reset */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="glass-input py-1.5 px-2.5 text-xs rounded-xl bg-slate-900 text-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {(search || activeTab !== 'all' || sortOrder !== 'newest') && (
              <button
                onClick={() => {
                  setSearch('');
                  setActiveTab('all');
                  setSortOrder('newest');
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* ── NOTIFICATIONS LIST ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader text="Retrieving technician task alerts..." />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="text-center py-14 space-y-3">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">You’re all caught up!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {activeTab === 'unread'
                  ? 'No unread alerts found. Great job staying on top of your tasks!'
                  : search
                  ? 'No task alerts match your search query.'
                  : 'No task alerts found for the selected filter.'}
              </p>
            </div>
          </Card>
        ) : (
          filteredNotifications.map((notif) => {
            const { icon: IconComp, colorClass } = getNotificationIcon(notif.type, notif.title);
            const timeAgo = notif.created_at
              ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })
              : 'Recently';

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                  !notif.is_read
                    ? 'bg-slate-900/90 border-l-4 border-l-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-950/20 hover:border-cyan-400/60'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Icon Box */}
                  <div className={`p-2.5 rounded-xl border shrink-0 ${colorClass}`}>
                    <IconComp className="w-5 h-5" />
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4
                          className={`text-sm font-bold leading-snug truncate ${
                            !notif.is_read ? 'text-white font-display' : 'text-slate-300'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        {!notif.is_read && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                            New
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono shrink-0">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {timeAgo}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed break-words">
                      {notif.message || notif.body}
                    </p>

                    {/* Footer Tags & Quick Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2">
                        {notif.reference_id && (
                          <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1">
                            <Ticket className="w-3 h-3" /> Ticket: {notif.reference_id}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {notif.reference_id && (
                          <button
                            onClick={() => handleNotificationClick(notif)}
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Ticket
                          </button>
                        )}

                        {!notif.is_read && (
                          <button
                            onClick={(e) => handleMarkSingleRead(notif.id, e)}
                            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                          >
                            Mark Read
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDeleteNotification(notif.id, e)}
                          className="text-xs text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors"
                          title="Dismiss Alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── TICKET DETAILS MODAL ── */}
      <ViewTicketModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        ticketId={selectedTicketId}
      />
    </div>
  );
};

export default TechnicianNotifications;
