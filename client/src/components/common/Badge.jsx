import React from 'react';

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    primary: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-md ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
