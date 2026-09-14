import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export const usePwaInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(
    typeof window !== 'undefined' ? window.deferredPwaPrompt : null
  );
  const [hasNativePrompt, setHasNativePrompt] = useState(
    typeof window !== 'undefined' && Boolean(window.deferredPwaPrompt)
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if running inside installed standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // Check if globally captured event is ready
    if (window.deferredPwaPrompt) {
      setDeferredPrompt(window.deferredPwaPrompt);
      setHasNativePrompt(true);
    }

    // Listen for display mode changes (e.g. user launches PWA)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsInstalled(true);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    // Capture native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPwaPrompt = e;
      setDeferredPrompt(e);
      setHasNativePrompt(true);
    };

    // Capture native appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setHasNativePrompt(false);
      setDeferredPrompt(null);
      window.deferredPwaPrompt = null;
      toast.success('App installed successfully.', {
        icon: '🎉',
        duration: 4000,
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const installApp = useCallback(async () => {
    const activePrompt = deferredPrompt || window.deferredPwaPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choiceResult = await activePrompt.userChoice;

        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setHasNativePrompt(false);
          setDeferredPrompt(null);
          window.deferredPwaPrompt = null;
          toast.success('App installed successfully.', {
            icon: '🎉',
            duration: 4000,
          });
          return true;
        } else {
          setHasNativePrompt(false);
          setDeferredPrompt(null);
          window.deferredPwaPrompt = null;
          return false;
        }
      } catch (err) {
        console.warn('PWA installation prompt error:', err);
        return false;
      }
    }
    return false;
  }, [deferredPrompt]);

  return {
    showInstallButton: !isStandalone && !isInstalled,
    hasNativePrompt,
    isInstalled,
    isStandalone,
    installApp,
  };
};

export default usePwaInstall;
