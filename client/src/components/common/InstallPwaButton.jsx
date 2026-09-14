import React from 'react';
import { Download, Sparkles } from 'lucide-react';
import usePwaInstall from '../../hooks/usePwaInstall';

const InstallPwaButton = () => {
  const { isInstallable, installApp } = usePwaInstall();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 animate-bounce-subtle">
      <button
        type="button"
        onClick={installApp}
        aria-label="Install Converge IT PWA App"
        className="group relative flex items-center space-x-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl 
                   bg-slate-900/90 hover:bg-slate-800/95 text-white 
                   border border-cyan-500/50 hover:border-cyan-400 
                   backdrop-blur-xl shadow-xl shadow-cyan-950/40 hover:shadow-cyan-500/25 
                   transition-all duration-300 active:scale-95 cursor-pointer touch-manipulation"
      >
        {/* Glow effect overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Download Icon with subtle spin/pulse on hover */}
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 group-hover:scale-110 transition-transform duration-300">
          <Download className="w-4 h-4 text-cyan-300 group-hover:translate-y-0.5 transition-transform duration-300" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col text-left">
          <span className="text-xs sm:text-sm font-extrabold tracking-wide text-white group-hover:text-cyan-200 transition-colors">
            Install App
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-cyan-400/90 flex items-center space-x-1">
            <span>Fast Desktop & Mobile</span>
            <Sparkles className="w-2.5 h-2.5 text-amber-400 inline" />
          </span>
        </div>
      </button>

      <style>{`
        @keyframes bounceSubtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-subtle {
          animation: bounceSubtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default InstallPwaButton;
