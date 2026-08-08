import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Ticket,
  MessageSquare,
  FileText,
  Bell,
  User
} from 'lucide-react';

const BottomNavbar = () => {
  const { isAdmin } = useAuth();

  const mobileNavItems = isAdmin
    ? [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
        { label: 'Tickets', icon: Ticket, path: '/admin/tickets' },
        { label: 'Messenger', icon: MessageSquare, path: '/admin/messenger' },
        { label: 'Reports', icon: FileText, path: '/admin/reports' },
        { label: 'Alerts', icon: Bell, path: '/admin/notifications' },
        { label: 'Profile', icon: User, path: '/admin/profile' },
      ]
    : [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/technician/dashboard' },
        { label: 'Tickets', icon: Ticket, path: '/technician/assigned' },
        { label: 'Reports', icon: FileText, path: '/technician/reports' },
        { label: 'Alerts', icon: Bell, path: '/technician/notifications' },
        { label: 'Profile', icon: User, path: '/technician/profile' },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav-bottom py-2 px-3 shadow-2xl">
      <div className="flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center space-y-1 py-1 px-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-cyan-400 font-semibold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-glow" />
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavbar;
