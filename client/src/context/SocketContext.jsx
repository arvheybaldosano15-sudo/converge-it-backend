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

    newSocket.on('notification:new', (notification) => {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} glass-panel max-w-md w-full bg-slate-900/90 text-white p-4 rounded-xl shadow-glass border border-cyan-500/30 flex items-start space-x-3 pointer-events-auto`}>
          <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-cyan-300">{notification.title}</h4>
            <p className="text-xs text-slate-300 mt-1">{notification.body || notification.message}</p>
          </div>
        </div>
      ));
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
              tag: notification.id ? `notif-${notification.id}` : `converge-${Date.now()}`,
              data: { url: targetUrl, ticketId: notification.reference_id }
            });
          }).catch((e) => console.error('SW notification error:', e));
        } else {
          try {
            new Notification(notifTitle, {
              body: notifBody,
              icon: '/logo.png',
              badge: '/logo.png',
              tag: notification.id ? `notif-${notification.id}` : `converge-${Date.now()}`
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
