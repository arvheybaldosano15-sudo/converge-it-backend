import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import TopNavbar from '../components/navigation/TopNavbar';
import BottomNavbar from '../components/navigation/BottomNavbar';
import NotificationPermissionBanner from '../components/common/NotificationPermissionBanner';
import { useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';

const prefetchTechData = async () => {
  try {
    const dashRes = await api.get('/dashboard/technician', { params: { fresh: true } });
    return { dashboard: dashRes?.data || null };
  } catch (_) {}
  return null;
};

const prefetchTechTickets = async () => {
  try {
    const res = await api.get('/tickets', { params: { limit: 100, fresh: true } });
    if (res && res.success && Array.isArray(res.data)) {
      try {
        localStorage.setItem('CONVERGE_TECH_ASSIGNED_TICKETS_CACHE_V3', JSON.stringify(res.data));
      } catch (_) {}
      return res.data;
    }
  } catch (_) {}
  return [];
};

const TechnicianLayout = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const queryClient = useQueryClient();

  // Prefetch technician dashboard & assigned tickets on mount so all pages load instantly on navigation
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['dashboard', 'technician'],
      queryFn: async () => {
        const res = await api.get('/dashboard/technician', { params: { fresh: true } });
        return res.data || {};
      },
      staleTime: 0,
    });

    queryClient.prefetchQuery({
      queryKey: ['tickets', { limit: 100 }],
      queryFn: prefetchTechTickets,
      staleTime: 0,
    });
  }, [queryClient]);

  return (
    <div className="flex min-h-screen bg-[#0f172a] text-slate-100 relative font-sans">
      {/* Background Grid Pattern & Ambient Glow (Isolated with overflow-hidden so it never clips sticky sidebar) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Background Grid Pattern (Matching Landing Page) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f1e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f1e_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Ambient Glow Effects (Matching Landing Page) */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-[30rem] h-[30rem] bg-blue-600/15 rounded-full blur-3xl animate-pulse-glow" />
      </div>

      {/* Sidebar — desktop with collapse support, mobile via drawer */}
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Top Navbar */}
        <TopNavbar
          onSearch={setSearchQuery}
          onMenuToggle={() => setSidebarOpen(true)}
          onDesktopMenuToggle={() => setSidebarCollapsed((prev) => !prev)}
          hideMobileMenu={true}
        />

        {/* Desktop notification permission nudge — shows only if Edge/Chrome hasn't granted permission */}
        <NotificationPermissionBanner />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 pb-24 md:pb-8">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>

      {/* Bottom navigation for mobile screen sizes */}
      <BottomNavbar />
    </div>
  );
};

export default TechnicianLayout;
