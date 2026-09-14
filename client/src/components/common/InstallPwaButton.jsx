import React, { useState } from 'react';
import { Download, Sparkles, Smartphone, Monitor, Share, PlusSquare, X, CheckCircle } from 'lucide-react';
import usePwaInstall from '../../hooks/usePwaInstall';
import Modal from './Modal';

const InstallPwaButton = () => {
  const { showInstallButton, hasNativePrompt, installApp } = usePwaInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!showInstallButton) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      const installed = await installApp();
      if (installed) return;
    }

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    if (isAndroid) {
      // Direct launch to Chrome on Android if native prompt isn't immediately captured
      const intentUrl = 'intent://' + window.location.host + window.location.pathname + window.location.search + '#Intent;scheme=https;package=com.android.chrome;end;';
      window.location.href = intentUrl;
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
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

          {/* Download Icon with subtle spin/pulse on hover */}
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Download className="w-4 h-4 text-cyan-300 group-hover:translate-y-0.5 transition-transform duration-300" />
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

      {/* PWA Manual Installation Guide Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-md"
      >
        <div className="p-5 sm:p-6 text-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-500/40 shrink-0 bg-slate-800">
                <img src="/logo.jpg" alt="Converge IT Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white font-display">Install Converge IT App</h3>
                <p className="text-xs text-cyan-400 font-medium">Fast, Direct & Offline Capable</p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <p className="text-slate-300">
              You can install Converge IT Solutions as a native app directly from your browser:
            </p>

            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 space-y-2.5">
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Android / Chrome / Edge:</span>
                  <span className="text-slate-300 text-xs">
                    Tap the browser menu <strong className="text-cyan-300">(⋮ or ⋯)</strong> and select <strong className="text-cyan-300">"Add to Home Screen"</strong> or <strong className="text-cyan-300">"Install App"</strong>.
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-700/50 pt-2.5 flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">iPhone / iOS Safari:</span>
                  <span className="text-slate-300 text-xs">
                    Tap the Share button <strong className="text-cyan-300">(⎋)</strong> at the bottom, scroll down and tap <strong className="text-cyan-300">"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 text-cyan-400 inline" />.
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-700/50 pt-2.5 flex items-start space-x-3">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Desktop Browser:</span>
                  <span className="text-slate-300 text-xs">
                    Click the <strong className="text-cyan-300">Install icon (+)</strong> in your browser address bar.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default InstallPwaButton;
