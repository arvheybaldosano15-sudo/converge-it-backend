import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';

import { getAuthToken } from '../utils/authStorage';
import api from '../utils/axios';
import { initPushNotifications } from '../utils/pushNotifications';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications/unread-count');
      if (res && res.data) {
        const freshCount = typeof res.data.count === 'number' ? res.data.count : parseInt(res.data.count || 0);
        // Always use the server count as the source of truth (no Math.max to avoid stale value locking)
        setUnreadNotifications(freshCount);
      }
    } catch (e) {
      // Quiet catch for transient network/auth status
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }
    fetchUnreadCount();
    // Automatically prompt and register mobile push notifications for technician/admin
    initPushNotifications();

    const handleFocus = () => {
      initPushNotifications();
      fetchUnreadCount();
    };

    window.addEventListener('focus', handleFocus);

    // 🔥 Keep Render backend alive — ping every 8 minutes to prevent cold start on mobile
    // Render free tier sleeps after 15 min inactivity → causes 10-30s load delays
    const keepAlive = setInterval(async () => {
      try {
        await api.get('/health');
      } catch (e) {
        // Silent — just a keep-alive ping
      }
    }, 8 * 60 * 1000); // 8 minutes

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(keepAlive);
    };
  }, [user]);

  useEffect(() => {
    const token = getAuthToken(user?.role);
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connecting via relative path/current origin allows Vite proxy (/socket.io) to route seamlessly on port 5173, 3030, and mobile IPs
    const socketUrl = import.meta.env.VITE_SOCKET_URL || '';

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      fetchUnreadCount();
    });

    const playNotificationChime = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {}
    };

    const triggerDesktopNotification = async (notification) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      try {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission();
        }
        if (perm !== 'granted') return;

        const rawTitle = notification?.title || 'Converge IT Alert';
        const notifTitle = rawTitle.startsWith('Converge') ? rawTitle : `Converge IT: ${rawTitle}`;
        const notifBody = notification?.body || notification?.message || 'You have a new support notification.';
        const notifTag = notification?.id ? `converge-notif-${notification.id}` : `converge-notif-${Date.now()}`;

        const options = {
          body: notifBody,
          icon: '/CSiLogo.png',
          badge: '/CSiLogo.png',
          tag: notifTag,
          renotify: true,
        };

        // Detect if running as an installed PWA (standalone) OR on mobile
        // On desktop browsers (non-PWA), new Notification() is the correct API.
        // reg.showNotification() requires an active push subscription on desktop Chrome — without
        // one it silently drops the call, which is why desktop never shows anything.
        const isStandalone =
          window.matchMedia('(display-mode: standalone)').matches ||
          window.navigator.standalone === true;
        const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isMobileDevice = isStandalone || isMobileUA;

        const isAssigned = /assigned/i.test(notifTitle) || /assigned/i.test(notifBody);

        // RULE: On mobile devices, ONLY assigned tickets trigger an OS notification / vibration!
        // Ticket creations (Messenger, unassigned tickets) must NOT trigger on mobile.
        if (isMobileDevice && !isAssigned) {
          return;
        }

        if (isMobileDevice && 'serviceWorker' in navigator) {
          // PWA/mobile: use Service Worker showNotification (supports vibrate, badge, actions)
          try {
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.showNotification) {
              await reg.showNotification(notifTitle, {
                ...options,
                vibrate: [200, 100, 200],
              });
              return;
            }
          } catch (swErr) {
            console.warn('SW notification failed, falling back to Notification API:', swErr);
          }
        }

        // Desktop browser (non-PWA) OR SW fallback:
        // new Notification() works reliably here without needing a push subscription
        new Notification(notifTitle, options);
      } catch (e) {
        console.error('Desktop Notification error:', e);
      }
    };

    newSocket.on('notification:new', (notification) => {
      // If technician, verify notification is addressed to this technician
      if (user?.role === 'technician') {
        if (notification?.user_id && String(notification.user_id) !== String(user.id)) {
          return;
        }
      }

      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
      const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isMobileDevice = isStandalone || isMobileUA;

      const notifTitle = notification?.title || '';
      const notifBody = notification?.body || notification?.message || '';
      const isAssigned = /assigned/i.test(notifTitle) || /assigned/i.test(notifBody);

      // On mobile devices, ONLY assigned tickets trigger alert sound and custom popup toast
      // Tickets created via Messenger or unassigned tickets update unread counts silently
      if (isMobileDevice && !isAssigned) {
        if (notification?.type === 'ticket') {
          setTimeout(() => fetchUnreadCount(), 500);
        } else {
          setUnreadNotifications((prev) => prev + 1);
        }
        return;
      }

      playNotificationChime();
      const techName = notification.assigned_technician_name || notification.data?.technicianName;

      toast.custom(
        (t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} fixed top-3 left-3 right-3 max-w-md mx-auto z-[9999] glass-panel bg-slate-950/95 text-white p-4 rounded-2xl shadow-2xl border-2 border-cyan-500/60 flex items-start space-x-3 pointer-events-auto backdrop-blur-xl`}>
            <div className="bg-cyan-500/20 p-2.5 rounded-xl text-cyan-400 shrink-0 border border-cyan-500/40">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-cyan-300 font-display truncate">{notification.title}</h4>
                <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-700/50">ALERT</span>
              </div>
              <p className="text-xs text-slate-200 mt-1 leading-snug line-clamp-2">{notification.body || notification.message}</p>
              {techName && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                  <span className="text-slate-400">Technician:</span>
                  <span className="text-emerald-300 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">{techName}</span>
                </div>
              )}
            </div>
          </div>
        ),
        { position: 'top-center', duration: 6000 }
      );

      // For ticket notifications: ticket:created already incremented badge at 0ms.
      // notification:new fires LATER (after DB write) — do a server sync to get accurate count.
      // For non-ticket (system/approval): increment normally since ticket:created won't fire.
      if (notification?.type === 'ticket') {
        setTimeout(() => fetchUnreadCount(), 500);
      } else {
        setUnreadNotifications((prev) => prev + 1);
      }

      // Trigger Desktop & Mobile Notification Banner
      triggerDesktopNotification(notification);
    });

    const handleCreatedNotification = (payload = {}) => {
      const ticket = payload?.ticket || payload?.data || payload;
      if (!ticket) return;

      const assignedTechId = ticket.assigned_technician_id || ticket.assignedTo;
      const techName = ticket.assigned_technician_name || ticket.technicianName || payload?.technicianName;

      // Technicians on mobile ONLY see notifications when assigned to them!
      if (user?.role === 'technician') {
        if (!assignedTechId || String(assignedTechId) !== String(user?.id)) {
          return; // DO NOT display notification or increment count on mobile for unassigned tickets or tickets assigned to others
        }
        setUnreadNotifications((prev) => prev + 1);
        playNotificationChime();
        triggerDesktopNotification({
          title: `Ticket #${ticket.ticket_number} Assigned`,
          body: `Ticket #${ticket.ticket_number} (${ticket.subject || 'Concern'}) has been assigned to you.`,
          data: { ticketId: ticket.id, ticketNumber: ticket.ticket_number, assignedTo: assignedTechId, technicianName: techName }
        });
        if (ticket?.ticket_number) {
          toast.info(`Ticket #${ticket.ticket_number} assigned to you (${techName || user?.full_name || 'Technician'})`);
        }
        return;
      }

      // Admins: receive notifications for all created tickets, showing technician name if assigned
      setUnreadNotifications((prev) => prev + 1);

      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
      const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isMobileDevice = isStandalone || isMobileUA;

      // On mobile devices, do not pop up toast notifications for unassigned/messenger ticket creations
      if (isMobileDevice && !assignedTechId) {
        return;
      }

      if (ticket?.ticket_number) {
        if (techName) {
          toast.info(`New Ticket #${ticket.ticket_number} created (Assigned: ${techName})`);
        } else {
          toast.info(`New Ticket #${ticket.ticket_number} created (Unassigned)`);
        }
      }
    };

    const handleAssignedNotification = (payload = {}) => {
      // Assignment notifications can ONLY be seen in the assigned technician's account
      if (user?.role !== 'technician') return;

      const ticket = payload?.ticket || payload?.data || payload;
      if (!ticket) return;

      const assignedTechId = ticket.assigned_technician_id || ticket.assignedTo;
      const techName = payload?.technicianName || ticket.assigned_technician_name || ticket.technicianName;

      if (assignedTechId && String(assignedTechId) !== String(user?.id)) {
        return;
      }

      setUnreadNotifications((prev) => prev + 1);
      playNotificationChime();
      triggerDesktopNotification({
        title: `Ticket #${ticket.ticket_number} Assigned`,
        body: `Ticket #${ticket.ticket_number} (${ticket.subject || 'Concern'}) has been assigned to you (${techName || 'Technician'}).`,
        data: { ticketId: ticket.id, ticketNumber: ticket.ticket_number, assignedTo: assignedTechId, technicianName: techName }
      });
      if (ticket?.ticket_number) {
        toast.info(`Ticket #${ticket.ticket_number} assigned to you (${techName || user?.full_name || 'Technician'})`);
      }
    };

    newSocket.on('ticket:created', handleCreatedNotification);
    newSocket.on('ticket_created', handleCreatedNotification);
    newSocket.on('ticket:assigned', handleAssignedNotification);

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, unreadNotifications, setUnreadNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
