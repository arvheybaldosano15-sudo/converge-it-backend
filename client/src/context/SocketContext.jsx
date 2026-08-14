import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';

import { getAuthToken } from '../utils/authStorage';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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
    });

    newSocket.on('notification:new', (notification) => {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} glass-panel max-w-md w-full bg-slate-900/90 text-white p-4 rounded-xl shadow-glass border border-cyan-500/30 flex items-start space-x-3 pointer-events-auto`}>
          <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-cyan-300">{notification.title}</h4>
            <p className="text-xs text-slate-300 mt-1">{notification.body}</p>
          </div>
        </div>
      ));
      setUnreadNotifications((prev) => prev + 1);
    });

    newSocket.on('ticket:created', ({ ticket }) => {
      if (user.role === 'admin') {
        toast.info(`New Ticket #${ticket.ticket_number} created`);
      }
    });

    newSocket.on('technician:new_pending', ({ fullName }) => {
      if (user.role === 'admin') {
        toast.info(`New Technician application: ${fullName}`);
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
