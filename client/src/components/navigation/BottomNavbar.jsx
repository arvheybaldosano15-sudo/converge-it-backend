import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Ticket,
  Clock,
  Bell,
  User,
} from 'lucide-react';

const BottomNavbar = () => {
  const { isAdmin } = useAuth();

  // Bottom navbar is designed specifically for technician mobile navigation as requested.
  if (isAdmin) return null;

  const items = [
    { label: 'Tickets', icon: Ticket, path: '/technician/assigned' },
    { label: 'History', icon: Clock, path: '/technician/history' },
    { label: 'Dashboard', icon: LayoutDashboard, path: '/technician/dashboard', isMiddle: true },
    { label: 'Alerts', icon: Bell, path: '/technician/notifications' },
    { label: 'Profile', icon: User, path: '/technician/profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/80 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.5)] overflow-visible">
      {/* Container with overflow-visible to accommodate the floating middle button */}
      <div className="relative flex items-center justify-around h-16 px-2 overflow-visible">
        {items.map((item) => {
          const Icon = item.icon;

          if (item.isMiddle) {
            return (
              <div key={item.path} className="relative flex flex-col items-center overflow-visible -mt-6">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 active:scale-95 hover:scale-105 z-50 border-4 border-slate-950
                     ${isActive 
                       ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/20' 
                       : 'bg-slate-800 text-slate-300 hover:bg-slate-700 shadow-black/40'
                     }`
                  }
                >
                  <Icon className="w-6 h-6" />
                </NavLink>
                <span className="text-[10px] font-semibold text-slate-400 mt-1 tracking-tight select-none">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-16 h-full py-1 text-xs transition-colors duration-200
                 ${isActive ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center">
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                    {isActive && (
                      <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight mt-1 select-none">{item.label}</span>
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
