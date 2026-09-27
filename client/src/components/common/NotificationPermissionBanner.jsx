import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

/**
 * NotificationPermissionBanner
 *
 * Why this exists:
 *   Desktop Edge/Chrome enforce that Notification.requestPermission() must be called
 *   from a user gesture (a click). Calling it from a socket event or useEffect fires
 *   silently with no visible prompt — so the user never grants permission and desktop
 *   notifications never appear.
 *
 *   Mobile already works because permission was granted during PWA install or via
 *   an earlier gesture. Desktop needs a visible one-time UI nudge.
 *
 * Shows only when:
 *   - Notification API is supported
 *   - Permission is 'default' (never asked via user gesture) or 'denied'
 *   - Not on mobile (Android/iOS)
 *   - Not dismissed in this session
 */
const NotificationPermissionBanner = () => {
  const [status, setStatus] = useState(null); // null | 'default' | 'denied' | 'granted'
  const [dismissed, setDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Don't show on mobile devices — they already handle it through the PWA install flow
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) return;

    if (!('Notification' in window)) return;

    // Check if user already permanently dismissed this banner
    const alreadyDismissed = sessionStorage.getItem('notif-banner-dismissed');
    if (alreadyDismissed) {
      setDismissed(true);
      return;
    }

    setStatus(Notification.permission);
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      // This is called from a click handler = valid user gesture
      // Edge/Chrome will now show the real system permission prompt
      const result = await Notification.requestPermission();
      setStatus(result);

      if (result === 'granted') {
        // Fire an immediate test notification so the user sees it worked
        try {
          const n = new Notification('Converge IT: Notifications Enabled ✅', {
            body: 'You will now receive desktop alerts for ticket assignments and updates.',
            icon: '/CSiLogo.png',
            tag: 'notif-enabled-confirm',
          });
          // Auto-close after 4s
          setTimeout(() => n.close(), 4000);
        } catch (_) {}
      }
    } catch (e) {
      console.error('requestPermission error:', e);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('notif-banner-dismissed', '1');
  };

  // Hide if: granted, dismissed, or not yet evaluated
  if (dismissed || status === 'granted' || status === null) return null;

  const isDenied = status === 'denied';

  return (
    <div className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm border-b z-50 ${
      isDenied
        ? 'bg-rose-950/80 border-rose-700/50 text-rose-200'
        : 'bg-amber-950/80 border-amber-700/50 text-amber-100'
    }`}>
      {isDenied ? (
        <BellOff className="w-4 h-4 shrink-0 text-rose-400" />
      ) : (
        <Bell className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
      )}

      <span className="flex-1 text-xs font-medium">
        {isDenied ? (
          <>
            Desktop notifications are <strong>blocked</strong> in your browser.
            Go to{' '}
            <strong>Edge Settings → Site permissions → Notifications</strong>
            {' '}and allow <em>converge-it-solution.vercel.app</em>, then reload.
          </>
        ) : (
          <>
            <strong>Enable desktop notifications</strong> to receive real-time ticket alerts on this PC.
          </>
        )}
      </span>

      {!isDenied && (
        <button
          onClick={handleEnable}
          disabled={isRequesting}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold transition-all active:scale-95 disabled:opacity-60 touch-manipulation cursor-pointer"
        >
          {isRequesting ? 'Requesting…' : 'Enable Now'}
        </button>
      )}

      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-current opacity-60 hover:opacity-100 transition-all cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default NotificationPermissionBanner;
