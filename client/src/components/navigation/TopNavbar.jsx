import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ProfileDropdown from './ProfileDropdown';
import { Bell, X, CheckCheck, Trash2, Clock, Menu, ExternalLink, Ticket, Wrench } from 'lucide-react';
import api from '../../utils/axios';
import { formatDistanceToNow } from 'date-fns';

const checkIsInstallation = (n) => {
  if (!n) return false;
  const typeLower = (n.type || '').toLowerCase();
  const catLower = (n.category_name || '').toLowerCase();
  const titleLower = (n.title || '').toLowerCase();
  const bodyLower = (n.body || n.message || '').toLowerCase();
  const subjectLower = (n.ticket_subject || '').toLowerCase();

  return (
    typeLower.includes('install') ||
    catLower.includes('install') ||
    titleLower.includes('installation') ||
    bodyLower.includes('installation') ||
    subjectLower.includes('installation') ||
    titleLower.includes('install request') ||
    bodyLower.includes('install request') ||
    titleLower.includes('new installation')
  );
};

const TopNavbar = ({ onSearch, onMenuToggle, hideMobileMenu = false, onDesktopMenuToggle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket, unreadNotifications, setUnreadNotifications } = useSocket();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const panelRef = useRef(null);

  const toggleTheme = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const fetchNotifications = async (showLoading = false) => {
    if (showLoading) setNotifLoading(true);
    try {
      const res = await api.get('/notifications?limit=20');
      if (res.success) setNotifications(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setNotifLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    if (user) {
      fetchNotifications(true);
    }
  }, [user]);

  // Auto-update notification dropdown list in real-time on socket event
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleNewNotification = (notification) => {
      if (notification) {
        setNotifications((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)]);
      }
      fetchNotifications(false);
    };

    const handleTicketCreated = (payload = {}) => {
      const ticket = payload?.ticket || payload?.data || payload;
      if (ticket && ticket.ticket_number) {
        const catName = (ticket.category_name || ticket.category?.name || '').toLowerCase();
        const subjectLower = (ticket.subject || '').toLowerCase();
        const descLower = (ticket.description || '').toLowerCase();
        const isInstall = catName.includes('installation') || subjectLower.includes('installation') || descLower.includes('installation');

        const notifItem = {
          id: 'temp-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          title: isInstall ? `New Installation Request #${ticket.ticket_number}` : `New Ticket #${ticket.ticket_number}`,
          message: isInstall
            ? `Installation Request #${ticket.ticket_number} created for ${ticket.customer_name || 'Customer'}.`
            : `Ticket #${ticket.ticket_number} created for ${ticket.customer_name || 'Customer'}.`,
          type: isInstall ? 'installation' : 'ticket',
          is_read: false,
          created_at: new Date().toISOString(),
          reference_id: ticket.id,
          category_name: ticket.category_name
        };
        // Instant 0ms prepend — no HTTP needed for badge (SocketContext handles that)
        setNotifications((prev) => [notifItem, ...prev.filter((n) => n.id !== notifItem.id)]);
      }
      // Delayed sync to replace temp item with real DB record
      setTimeout(() => fetchNotifications(false), 2000);
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('ticket:created', handleTicketCreated);
    socket.on('ticket_created', handleTicketCreated);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('ticket:created', handleTicketCreated);
      socket.off('ticket_created', handleTicketCreated);
    };
  }, [socket]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotifications(0);
    } catch (e) {}
  };

  const markOneRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadNotifications((prev) => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const deleteNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {}
  };

  const handleBellClick = () => {
    if (!notifOpen) fetchNotifications();
    setNotifOpen((prev) => !prev);
  };

  const handleNotifClick = (n) => {
    if (!n.is_read) markOneRead(n.id);
    setNotifOpen(false);
    if (user?.role === 'admin') {
      const isInstallation = checkIsInstallation(n);
      if (isInstallation) {
        navigate('/admin/installation-requests');
      } else {
        navigate('/admin/tickets');
      }
    } else if (user?.role === 'technician') {
      navigate('/technician/assigned');
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Desktop hamburger + Mobile hamburger/brand */}
      <div className="flex items-center space-x-2">
        {/* Desktop hamburger — always visible on md+ */}
        <button
          onClick={onDesktopMenuToggle}
          className="hidden md:flex p-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile: brand-only for technician OR hamburger for admin */}
        {hideMobileMenu ? (
          <div className="md:hidden flex items-center space-x-2.5">
            <div className="bg-white rounded-lg px-2 py-1 flex items-center justify-center shadow-md" style={{height: '36px', minWidth: '80px'}}>
              <img
                src="/CSiLogo.png"
                alt="Converge IT Solutions Logo"
                className="h-6 w-auto object-contain"
              />
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 transition-colors"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="md:hidden flex items-center space-x-2">
              <span className="font-display font-bold text-sm text-white">CONVERGE</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center space-x-3">
        {/* Notifications Bell — opens inline panel */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 transition-colors"
            title="Notifications"
          >
            <Bell className={`w-4 h-4 ${notifOpen ? 'text-blue-400' : ''}`} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center animate-pulse border border-slate-950 px-1">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 max-h-[480px] flex flex-col rounded-2xl border border-slate-700/80 bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white font-display">Notifications</h3>
                <div className="flex items-center gap-2">
                  {notifications.some((n) => !n.is_read) && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1">
                {notifLoading ? (
                  <div className="text-xs text-slate-400 text-center py-10">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-500 gap-2">
                    <Bell className="w-8 h-8 opacity-30" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isInstallation = checkIsInstallation(n);
                    const isTicketNotif = n.type === 'ticket' || n.type === 'installation' || n.title?.includes('#') || n.reference_id;

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-slate-800/60 transition-colors cursor-pointer group ${
                          n.is_read ? 'opacity-60' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Unread dot */}
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-blue-400 animate-pulse'}`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            {isInstallation ? (
                              <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-1">
                                <Wrench className="w-2.5 h-2.5" /> Installation Request
                              </span>
                            ) : isTicketNotif ? (
                              <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0 flex items-center gap-1">
                                <Ticket className="w-2.5 h-2.5" /> Tickets Management
                              </span>
                            ) : null}
                          </div>

                          <p className={`text-xs font-semibold ${n.is_read ? 'text-slate-400' : 'text-slate-100'} leading-snug`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.body || n.message}</p>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </div>
                        </div>

                        <button
                          onClick={(e) => deleteNotif(n.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-2.5 border-t border-slate-800 text-center bg-slate-900/60">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    navigate(user?.role === 'admin' ? '/admin/notifications' : '/technician/notifications');
                  }}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1.5"
                >
                  View All Notifications <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <ProfileDropdown />
      </div>
    </header>
  );
};

export default TopNavbar;
