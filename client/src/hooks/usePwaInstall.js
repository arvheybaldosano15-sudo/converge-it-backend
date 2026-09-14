import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export const usePwaInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone / PWA mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    };

    checkStandalone();

    // Catch the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Only show install button if not already in standalone mode
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

      if (!isStandaloneMode) {
        setIsInstallable(true);
      }
    };

    // Catch successful PWA installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
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
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        toast.success('App installed successfully.', {
          icon: '🎉',
          duration: 4000,
        });
        return true;
      } else {
        // User dismissed the prompt — hide gracefully to avoid nagging
        setIsInstallable(false);
        return false;
      }
    } catch (err) {
      console.warn('PWA installation prompt error:', err);
      return false;
    }
  }, [deferredPrompt]);

  return {
    isInstallable: isInstallable && !isStandalone && !isInstalled,
    isInstalled,
    isStandalone,
    installApp,
  };
};

export default usePwaInstall;
