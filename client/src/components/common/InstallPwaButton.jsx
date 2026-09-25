import React from 'react';
import { Download, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import usePwaInstall from '../../hooks/usePwaInstall';

const InstallPwaButton = ({ variant = 'navbar', className = '' }) => {
  const { showInstallButton, installApp } = usePwaInstall();

  if (!showInstallButton) return null;

  const handleClick = async () => {
    // Directly trigger native installation prompt
    const installed = await installApp();
    if (installed) return;

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isInApp = /FBAN|FBAV|Instagram|Line|Twitter|MicroMessenger/i.test(ua);

    if (isAndroid && isInApp) {
      toast('Opening in Google Chrome for app installation...', { icon: '🚀', id: 'pwa-android-intent' });
      const intentUrl = 'intent://' + window.location.host + window.location.pathname + window.location.search + '#Intent;scheme=https;package=com.android.chrome;end;';
      window.location.href = intentUrl;
    } else if (isAndroid) {
      toast('Tap the browser menu (⋮) at top-right and select "Install App" or "Add to Home Screen".', { icon: '📱', duration: 6000, id: 'pwa-android-menu' });
    } else if (isIOS) {
      toast('To install on iPhone/iPad: Tap Share (⎋) below, then select "Add to Home Screen".', { icon: '📱', duration: 6000, id: 'pwa-ios' });
    } else {
      toast('To install on Desktop: Click the Install icon (+) in your browser address bar.', { icon: '🖥️', duration: 5000, id: 'pwa-desktop' });
    }
  };

  if (variant === 'navbar') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install Converge IT App"
        className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/40 text-xs font-bold text-cyan-300 hover:text-white transition-all active:scale-95 shadow-sm cursor-pointer ${className}`}
      >
        <div className="w-4 h-4 rounded-md bg-slate-900 border border-cyan-400/60 overflow-hidden shrink-0 flex items-center justify-center">
          <img src="/logo16.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <span>Install App</span>
      </button>
    );
  }

  if (variant === 'inline' || variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install Converge IT App"
        className={`group relative inline-flex items-center space-x-2.5 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl 
                   bg-slate-900/90 hover:bg-slate-800/95 text-white 
                   border border-cyan-500/60 hover:border-cyan-400 
                   backdrop-blur-xl shadow-xl shadow-cyan-950/40 hover:shadow-cyan-500/20 
                   transition-all duration-300 active:scale-95 cursor-pointer touch-manipulation ${className}`}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-cyan-400/50 overflow-hidden group-hover:scale-105 transition-transform duration-300 shrink-0">
          <img src="/logo16.png" alt="Converge IT Logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs sm:text-sm font-extrabold tracking-wide text-white group-hover:text-cyan-200 transition-colors flex items-center gap-1.5">
            <span>Install App</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-cyan-400/90">
            Mobile & Desktop PWA
          </span>
        </div>
      </button>
    );
  }

  return null;
};

export default InstallPwaButton;
