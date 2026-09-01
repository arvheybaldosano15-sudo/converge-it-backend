import React, { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Ticket,
  Users,
  UserCheck,
  BookOpen,
  BarChart3,
  ShieldCheck,
  Sparkles,
  User,
  Settings,
  X,
  LogOut,
  Wrench,
  Clock,
  ClipboardList,
  Bell,
} from 'lucide-react';

const Sidebar = ({ mobileOpen, onClose, collapsed = false }) => {
  const { isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const wasTech = !isAdmin;
    await logout();
    if (wasTech) {
      navigate('/technician-login');
    } else {
      navigate('/login');
    }
  };

  const adminNavItems = [
    { label: 'Dashboard',          icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Installation Request', icon: ClipboardList, path: '/admin/installation-requests' },
    { label: 'Tickets',            icon: Ticket,          path: '/admin/tickets' },
    { label: 'Customers',          icon: Users,           path: '/admin/customers' },
    { label: 'Technicians',        icon: Wrench,          path: '/admin/technicians' },
    { label: 'Approvals',          icon: UserCheck,       path: '/admin/approvals' },
    { label: 'Reports & Analytics',icon: BarChart3,       path: '/admin/reports' },
    { label: 'AI Recommendations', icon: Sparkles,        path: '/admin/ai' },
    { label: 'Audit Logs',         icon: ShieldCheck,     path: '/admin/audit-logs' },
    { label: 'Settings',           icon: Settings,        path: '/admin/settings' },
  ];

  const technicianNavItems = [
    { label: 'Dashboard',        icon: LayoutDashboard, path: '/technician/dashboard' },
    { label: 'Assigned Tickets', icon: Ticket,          path: '/technician/assigned' },
    { label: 'Ticket History',   icon: Clock,           path: '/technician/history' },
    { label: 'Notifications',    icon: Bell,            path: '/technician/notifications' },
    { label: 'Profile',          icon: User,            path: '/technician/profile' },
  ];

  const items = isAdmin ? adminNavItems : technicianNavItems;

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileOpen) onClose?.();
  }, [location.pathname]);

  const navList = (
    <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-xl transition-all duration-200 group relative
               ${collapsed ? 'justify-center px-0 py-3 mx-1' : 'space-x-3 px-3 py-2.5'}
               ${isActive ? 'active-nav-item' : 'inactive-nav-item'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  style={{
                    width: '1.1rem',
                    height: '1.1rem',
                    flexShrink: 0,
                    color: isActive ? '#ffffff' : 'var(--sidebar-text)',
                  }}
                />
                {/* Label — hidden when collapsed */}
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {/* Tooltip on collapsed hover */}
                {collapsed && (
                  <span className="sidebar-tooltip">{item.label}</span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">

      {/* ── Brand Header ── */}
      <div
        className={`flex items-center h-20 shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}
        style={{ borderBottom: '1px solid rgba(30,58,138,0.35)' }}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
          <img
            src="/logo.png"
            alt="Converge IT Solutions Logo"
            className="w-10 h-10 object-contain shrink-0 drop-shadow-md transition-all"
          />
          {!collapsed && (
            <div className="leading-tight">
              <h1 className="font-display font-extrabold text-base tracking-wide" style={{ color: 'var(--sidebar-brand-text)' }}>CONVERGE IT</h1>
              <p className="text-xs font-semibold" style={{ color: 'var(--sidebar-brand-sub)' }}>Ticketing System</p>
            </div>
          )}
        </div>

        {/* Close button — mobile only */}
        {!collapsed && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            style={{ background: 'rgba(29,78,216,0.12)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Nav List ── */}
      {navList}

      {/* ── Footer / Logout ── */}
      <div className="p-2 shrink-0" style={{ borderTop: '1px solid rgba(30,58,138,0.25)' }}>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`flex items-center w-full rounded-xl transition-colors logout-btn relative group
            ${collapsed ? 'justify-center px-0 py-3' : 'space-x-3 px-3 py-2.5'}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
          {collapsed && <span className="sidebar-tooltip">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col h-screen sticky top-0 z-40 shrink-0 sidebar-desktop transition-all duration-300"
        style={{ width: collapsed ? '4rem' : '16rem' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 h-full w-72 sidebar-mobile shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      <style>{`
        .sidebar-desktop {
          background: var(--sidebar-bg);
          border-right: 1px solid var(--sidebar-border);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: background 0.3s, border-color 0.3s;
        }
        .sidebar-mobile {
          background: var(--sidebar-bg);
          border-right: 1px solid var(--sidebar-border);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: background 0.3s, border-color 0.3s;
        }
        .active-nav-item {
          background: linear-gradient(135deg, rgba(30,58,138,0.90), rgba(29,78,216,0.85));
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(29,78,216,0.28), inset 0 1px 0 rgba(255,255,255,0.08);
          border: 1px solid rgba(96,165,250,0.25);
        }
        .inactive-nav-item {
          color: var(--sidebar-text);
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .inactive-nav-item:hover {
          background: rgba(29, 78, 216, 0.10);
          color: var(--sidebar-text-hover);
          border-color: rgba(29, 78, 216, 0.18);
        }
        .logout-btn {
          color: #f87171;
        }
        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.08);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.15);
        }
        /* Tooltip shown on icon-only sidebar */
        .sidebar-tooltip {
          position: absolute;
          left: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%);
          background: rgba(15, 23, 60, 0.97);
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 8px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          border: 1px solid rgba(30,58,138,0.5);
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          transition: opacity 0.15s ease;
          z-index: 100;
        }
        .group:hover .sidebar-tooltip {
          opacity: 1;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
