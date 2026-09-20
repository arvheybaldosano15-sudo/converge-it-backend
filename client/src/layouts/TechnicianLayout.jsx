import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import TopNavbar from '../components/navigation/TopNavbar';
import BottomNavbar from '../components/navigation/BottomNavbar';
import { useQueryClient } from '@tanstack/react-query';
import api from '../utils/axios';

const prefetchTechData = async () => {
  try {
    const [dashRes, ticketsRes] = await Promise.all([
      api.get('/dashboard/technician'),
      api.get('/tickets', { params: { limit: 50 } }),
    ]);
    if (dashRes?.data) {
      try { localStorage.setItem('CONVERGE_TECH_DASHBOARD_CACHE', JSON.stringify(dashRes.data)); } catch (_) {}
    }
    if (ticketsRes?.data && Array.isArray(ticketsRes.data)) {
      try { localStorage.setItem('CONVERGE_TECH_TICKETS_CACHE', JSON.stringify(ticketsRes.data)); } catch (_) {}
    }
    return { dashboard: dashRes?.data || null, tickets: ticketsRes?.data || [] };
  } catch (_) {}
  return null;
};

const TechnicianLayout = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const queryClient = useQueryClient();

  // Prefetch technician data on mount so all pages load instantly on navigation
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['dashboard', 'technician'],
      queryFn: async () => {
        const res = await api.get('/dashboard/technician');
        const data = res.data || {};
        try { localStorage.setItem('CONVERGE_TECH_DASHBOARD_CACHE', JSON.stringify(data)); } catch (_) {}
        return data;
      },
      staleTime: 0,
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
          hideMobileMenu={true}
        />

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
