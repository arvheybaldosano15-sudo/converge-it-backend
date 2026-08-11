import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/navigation/Sidebar';
import TopNavbar from '../components/navigation/TopNavbar';
import TechnicianBottomNav from '../components/navigation/TechnicianBottomNav';

const TechnicianLayout = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#070b1e]">
      {/* Sidebar — desktop only (hidden on mobile via md:flex), with collapse support */}
      <Sidebar
        mobileOpen={false}
        onClose={() => {}}
        collapsed={sidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Top Navbar — no hamburger drawer on mobile for technicians */}
        <TopNavbar
          onSearch={setSearchQuery}
          onMenuToggle={() => {}}
          hideMobileMenu
          onDesktopMenuToggle={() => setSidebarCollapsed((prev) => !prev)}
        />

        {/* Page Body — extra bottom padding on mobile so content clears the bottom nav */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>

      {/* Bottom Nav — mobile only */}
      <TechnicianBottomNav />
    </div>
  );
};

export default TechnicianLayout;
