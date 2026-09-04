import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="relative min-h-screen w-full bg-[#0f172a] flex items-center justify-center p-4 overflow-hidden">
      {/* User Requested Grid Pattern Background */}
      <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      {/* Ambient Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      {/* Main Form Content */}
      <div className="w-full max-w-md relative z-10">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
