import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import TopNavbar from '../components/navigation/TopNavbar';
import NotificationPermissionBanner from '../components/common/NotificationPermissionBanner';
import { useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';

// Prefetch function — mirrors fetchInstallationRequests in useInstallationRequests.js
const prefetchInstallationRequests = async () => {
  try {
    const res = await api.get('/tickets', {
      params: { categoryName: 'Installation Request', limit: 50 },
    });
    if (res.success && Array.isArray(res.data)) {
      try {
        localStorage.setItem('CONVERGE_INSTALLATION_REQUESTS_CACHE', JSON.stringify(res.data));
      } catch (_) {}
      return res.data;
    }
  } catch (_) {}
  return [];
};

const AdminLayout = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const queryClient = useQueryClient();

  // Prefetch installation requests in the background as soon as admin layout mounts
  // so that navigating to /admin/installation-requests shows data instantly
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['installation-requests'],
      queryFn: prefetchInstallationRequests,
      staleTime: 0, // Always prefetch fresh data
    });
  }, [queryClient]);

  return (
    <div className="flex min-h-screen bg-[#0f172a] text-slate-100 relative overflow-hidden font-sans">
      {/* Background Grid Pattern (Matching Landing Page) */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f1e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f1e_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />

      {/* Ambient Glow Effects (Matching Landing Page) */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow z-0" />
      <div className="fixed bottom-1/3 right-1/4 w-[30rem] h-[30rem] bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow z-0" />

      {/* Sidebar — desktop with collapse support, mobile via drawer */}
      <Sidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10">
        {/* Top Navbar */}
        <TopNavbar
          onSearch={setSearchQuery}
          onMenuToggle={() => setSidebarOpen(true)}
          onDesktopMenuToggle={() => setSidebarCollapsed((prev) => !prev)}
        />

        {/* Desktop notification permission nudge — shows only if Edge/Chrome hasn't granted permission */}
        <NotificationPermissionBanner />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
