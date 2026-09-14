import React from 'react';
import { Download, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import usePwaInstall from '../../hooks/usePwaInstall';

const InstallPwaButton = () => {
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
      // Only launch Chrome intent if opened inside Messenger or other in-app webviews
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

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 animate-pulse-subtle">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Install Converge IT App"
        className="group relative flex items-center space-x-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl 
                   bg-slate-900/90 hover:bg-slate-800/95 text-white 
                   border border-cyan-500/60 hover:border-cyan-400 
                   backdrop-blur-xl shadow-2xl shadow-cyan-950/60 hover:shadow-cyan-500/30 
                   transition-all duration-300 active:scale-95 cursor-pointer touch-manipulation"
      >
        {/* Glow effect overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* App Logo Icon with subtle zoom on hover */}
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800 border border-cyan-400/50 overflow-hidden group-hover:scale-110 transition-transform duration-300 shrink-0">
          <img src="/logo16.png" alt="Converge IT Logo" className="w-full h-full object-cover" />
        </div>

        {/* Text Details */}
        <div className="flex flex-col text-left">
          <span className="text-xs sm:text-sm font-extrabold tracking-wide text-white group-hover:text-cyan-200 transition-colors flex items-center gap-1.5">
            <span>Install App</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-cyan-400/90">
            Mobile & Desktop PWA
          </span>
        </div>
      </button>

      <style>{`
        @keyframes pulseSubtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-pulse-subtle {
          animation: pulseSubtle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default InstallPwaButton;
