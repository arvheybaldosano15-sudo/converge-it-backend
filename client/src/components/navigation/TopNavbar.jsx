import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ProfileDropdown from './ProfileDropdown';
import SearchBar from '../common/SearchBar';
import { Bell, Sun, Moon, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TopNavbar = ({ onSearch }) => {
  const { user } = useAuth();
  const { unreadNotifications } = useSocket();
  const [darkMode, setDarkMode] = useState(true);
  const navigate = useNavigate();

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Brand / Global Search */}
      <div className="flex items-center space-x-4 flex-1 max-w-md">
        <div className="md:hidden flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
            C
          </div>
          <span className="font-display font-bold text-sm text-white">CONVERGE</span>
        </div>

        <div className="hidden sm:block flex-1">
          <SearchBar onSearch={onSearch || (() => {})} placeholder="Global search tickets..." />
        </div>
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

        {/* Notifications Icon */}
        <button
          onClick={() => navigate(user?.role === 'admin' ? '/admin/notifications' : '/technician/notifications')}
          className="relative p-2 rounded-xl glass-panel hover:bg-slate-800 text-slate-300 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        {/* Profile Dropdown */}
        <ProfileDropdown />
      </div>
    </header>
  );
};

export default TopNavbar;
