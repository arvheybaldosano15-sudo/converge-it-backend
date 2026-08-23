import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ProfileDropdown from './ProfileDropdown';
import { Bell, Sun, Moon, X, CheckCheck, Trash2, Clock, Menu } from 'lucide-react';
import api from '../../utils/axios';
import { formatDistanceToNow } from 'date-fns';

const TopNavbar = ({ onSearch, onMenuToggle, hideMobileMenu = false, onDesktopMenuToggle }) => {
  const { user } = useAuth();
  const { unreadNotifications, setUnreadNotifications } = useSocket();
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

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/notifications?limit=20');
      if (res.success) setNotifications(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setNotifLoading(false);
    }
  };

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
            <img
              src="/logo.png"
              alt="Converge Logo"
              className="w-8 h-8 object-contain drop-shadow-md"
            />
            <span className="font-display font-extrabold text-base text-white tracking-wide">CONVERGE</span>
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
        {/* Dark/Light Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 transition-colors"
          title="Toggle Theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Notifications Bell — opens inline panel */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 transition-colors"
            title="Notifications"
          >
            <Bell className={`w-4 h-4 ${notifOpen ? 'text-blue-400' : ''}`} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
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
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && markOneRead(n.id)}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-slate-800/60 transition-colors cursor-pointer group ${
                        n.is_read ? 'opacity-60' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Unread dot */}
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-blue-400 animate-pulse'}`} />

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${n.is_read ? 'text-slate-400' : 'text-slate-100'} leading-snug`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-600">
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
                  ))
                )}
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
