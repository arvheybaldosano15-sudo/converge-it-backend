import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Settings, LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfileDropdown = () => {
  const { user, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1.5 rounded-xl glass-panel hover:bg-slate-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs uppercase shadow-md">
          {user?.fullName ? user.fullName.charAt(0) : 'U'}
        </div>
        <div className="hidden lg:block text-left pr-1 leading-tight">
          <p className="text-xs font-semibold text-slate-200">{user?.fullName || 'User'}</p>
          <span className="text-[10px] text-cyan-400 font-medium capitalize">{user?.role}</span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 glass-panel bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-800 p-2 z-50 animate-enter">
          <div className="px-3 py-2 border-b border-slate-800 mb-1">
            <p className="text-xs font-bold text-white">{user?.fullName}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            <div className="mt-1 inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold">
              <Shield className="w-3 h-3" />
              <span className="capitalize">{user?.role}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              navigate(isAdmin ? '/admin/profile' : '/technician/profile');
            }}
            className="flex items-center space-x-2.5 w-full px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <User className="w-4 h-4 text-cyan-400" />
            <span>My Profile</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/settings');
              }}
              className="flex items-center space-x-2.5 w-full px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
              <span>System Settings</span>
            </button>
          )}

          <div className="border-t border-slate-800 my-1" />

          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="flex items-center space-x-2.5 w-full px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
