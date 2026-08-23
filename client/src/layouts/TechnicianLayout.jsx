import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import TopNavbar from '../components/navigation/TopNavbar';

const TechnicianLayout = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

export default TechnicianLayout;
