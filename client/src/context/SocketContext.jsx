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
        setUnreadNotifications(typeof res.data.count === 'number' ? res.data.count : parseInt(res.data.count || 0));
      }
    } catch (e) {
      console.error('fetchUnreadCount error:', e);
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
    };

    window.addEventListener('focus', handleFocus);
    const interval = setInterval(fetchUnreadCount, 8000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
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

    // In dev: connect to backend (localhost:5000) via VITE_SOCKET_URL
    // In production: backend and frontend share the same origin so window.location.origin works
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
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

    newSocket.on('notification:new', (notification) => {
      playNotificationChime();
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
            </div>
          </div>
        ),
        { position: 'top-center', duration: 6000 }
      );
      setUnreadNotifications((prev) => prev + 1);
      fetchUnreadCount();

      // Trigger actual native mobile phone top pop-up notification banner
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notifTitle = notification.title || 'Converge Support Alert';
        const notifBody = notification.body || notification.message || 'You have a new support notification.';
        const targetUrl = user?.role === 'technician' ? '/technician/assigned' : '/admin/tickets';

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(notifTitle, {
              body: notifBody,
              icon: '/logo.png',
              badge: '/logo.png',
              vibrate: [300, 100, 300, 100, 300],
              requireInteraction: true,
              renotify: true,
              tag: `converge-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              data: { url: targetUrl, ticketId: notification.reference_id }
            });
          }).catch((e) => console.error('SW notification error:', e));
        } else {
          try {
            new Notification(notifTitle, {
              body: notifBody,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: `converge-alert-${Date.now()}`
            });
          } catch (e) {
            console.error('Local Notification error:', e);
          }
        }
      }
    });

    newSocket.on('ticket:created', ({ ticket }) => {
      if (user?.role === 'admin') {
        toast.info(`New Ticket #${ticket?.ticket_number || ticket?.id} created`);
        setUnreadNotifications((prev) => prev + 1);
        fetchUnreadCount();
      }
    });

    newSocket.on('ticket_created', ({ ticket }) => {
      if (user?.role === 'admin') {
        setUnreadNotifications((prev) => prev + 1);
        fetchUnreadCount();
      }
    });

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
