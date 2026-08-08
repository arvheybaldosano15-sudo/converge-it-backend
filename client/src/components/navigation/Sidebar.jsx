import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Ticket,
  MessageSquare,
  Users,
  UserCheck,
  BookOpen,
  FileText,
  BarChart3,
  Bell,
  ShieldCheck,
  Sparkles,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wrench,
  Clock,
  ClipboardList
} from 'lucide-react';

const Sidebar = () => {
  const { user, isAdmin, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const adminNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Tickets', icon: Ticket, path: '/admin/tickets' },
    { label: 'Messenger', icon: MessageSquare, path: '/admin/messenger' },
    { label: 'Customers', icon: Users, path: '/admin/customers' },
    { label: 'Technicians', icon: Wrench, path: '/admin/technicians' },
    { label: 'Approvals', icon: UserCheck, path: '/admin/approvals' },
    { label: 'Knowledge Base', icon: BookOpen, path: '/admin/knowledge-base' },
    { label: 'Reports', icon: FileText, path: '/admin/reports' },
    { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    { label: 'AI Recommendations', icon: Sparkles, path: '/admin/ai' },
    { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
    { label: 'Audit Logs', icon: ShieldCheck, path: '/admin/audit-logs' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  const technicianNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/technician/dashboard' },
    { label: 'Assigned Tickets', icon: Ticket, path: '/technician/assigned' },
    { label: 'Ticket History', icon: Clock, path: '/technician/history' },
    { label: 'Service Reports', icon: ClipboardList, path: '/technician/reports' },
    { label: 'Notifications', icon: Bell, path: '/technician/notifications' },
    { label: 'Profile', icon: User, path: '/technician/profile' },
  ];

  const items = isAdmin ? adminNavItems : technicianNavItems;

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 z-40 transition-all duration-300 glass-panel border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-xl ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header / Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
              C
            </div>
            <div className="leading-tight">
              <h1 className="font-display font-bold text-sm tracking-wide text-white">CONVERGE IT</h1>
              <p className="text-[10px] text-cyan-400 font-medium">Ticketing System</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20 mx-auto">
            C
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/80 to-cyan-500/80 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Footer / User & Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={logout}
          className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors ${
            collapsed ? 'justify-center px-0' : ''
          }`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
