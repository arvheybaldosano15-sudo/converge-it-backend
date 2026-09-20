import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import TopNavbar from '../components/navigation/TopNavbar';
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
    <div className="flex min-h-screen bg-transparent">
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
        />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
