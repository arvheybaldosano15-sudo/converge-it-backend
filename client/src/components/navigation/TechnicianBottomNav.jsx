import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  LayoutDashboard,
  Ticket,
  Clock,
  ClipboardList,
  Bell,
  User,
  LogOut,
} from 'lucide-react';

const leftItems = [
  { label: 'Assigned', icon: Ticket,        path: '/technician/assigned' },
  { label: 'History',  icon: Clock,         path: '/technician/history' },
];

const rightItems = [
  { label: 'Alerts',   icon: Bell,          path: '/technician/notifications' },
  { label: 'Profile',  icon: User,          path: '/technician/profile' },
];

const TechnicianBottomNav = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { unreadNotifications } = useSocket() || {};

  const handleLogout = async () => {
    await logout();
    navigate('/technician-login');
  };

  return (
    <>
      {/* Spacer so page content doesn't hide behind the fixed bar */}
      <div className="h-24 md:hidden" />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 tech-bottom-nav px-2 pb-2 pt-1 safe-area-pb">
        <div className="flex items-end justify-between max-w-md mx-auto relative">
          
          {/* Left Nav Items */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {leftItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all duration-200 min-w-[48px] ${
                      isActive ? 'tech-nav-active scale-105' : 'tech-nav-inactive'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="relative">
                        <Icon className="w-[20px] h-[20px]" />
                        {isActive && (
                          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_2px_rgba(96,165,250,0.6)]" />
                        )}
                      </div>
                      <span className="text-[9px] font-semibold tracking-tight leading-none">
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Center Floating Dashboard Button */}
          <div className="flex flex-col items-center relative -top-3 px-1 shrink-0">
            <NavLink
              to="/technician/dashboard"
              className={({ isActive }) =>
                `w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                  isActive
                    ? 'bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white scale-105 shadow-blue-600/60 ring-4 ring-[#060c26] border border-blue-400/50'
                    : 'bg-gradient-to-tr from-slate-900 to-blue-950 text-blue-400 hover:text-white shadow-black/50 ring-4 ring-[#060c26] border border-blue-800/40'
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5" />
            </NavLink>
            <span className="text-[9px] font-bold tracking-tight text-white mt-1">
              Dashboard
            </span>
          </div>

          {/* Right Nav Items */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {rightItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all duration-200 min-w-[48px] ${
                      isActive ? 'tech-nav-active scale-105' : 'tech-nav-inactive'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="relative">
                        <Icon className="w-[20px] h-[20px]" />
                        {item.path === '/technician/notifications' && unreadNotifications > 0 && (
                          <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white font-extrabold text-[9px] rounded-full w-4 h-4 flex items-center justify-center border border-slate-950 animate-pulse">
                            {unreadNotifications > 9 ? '9+' : unreadNotifications}
                          </span>
                        )}
                        {isActive && (
                          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_2px_rgba(96,165,250,0.6)]" />
                        )}
                      </div>
                      <span className="text-[9px] font-semibold tracking-tight leading-none">
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all duration-200 min-w-[48px] tech-nav-logout"
            >
              <LogOut className="w-[20px] h-[20px]" />
              <span className="text-[9px] font-semibold tracking-tight leading-none">Logout</span>
            </button>
          </div>

        </div>
      </nav>

      <style>{`
        .w-13 { width: 3.25rem; }
        .h-13 { height: 3.25rem; }
        .tech-bottom-nav {
          background: rgba(6, 12, 38, 0.95);
          border-top: 1px solid rgba(30, 58, 138, 0.45);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45), 0 -1px 0 rgba(96, 165, 250, 0.08);
        }
        .tech-nav-active {
          background: linear-gradient(135deg, rgba(30,58,138,0.85), rgba(29,78,216,0.75));
          color: #93c5fd;
          border: 1px solid rgba(96,165,250,0.28);
          box-shadow: 0 4px 14px rgba(29,78,216,0.30);
        }
        .tech-nav-inactive {
          color: #475569;
          border: 1px solid transparent;
        }
        .tech-nav-inactive:hover {
          color: #94a3b8;
          background: rgba(29,78,216,0.08);
        }
        .tech-nav-logout {
          color: #f87171;
          border: 1px solid transparent;
        }
        .tech-nav-logout:hover {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.10);
          border-color: rgba(239, 68, 68, 0.18);
        }
        .safe-area-pb {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </>
  );
};

export default TechnicianBottomNav;
