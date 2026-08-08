const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.userId})`);
    socket.join(`user:${socket.userId}`);
    if (socket.userRole === 'admin') socket.join('admins');

    socket.on('join:ticket', (ticketId) => socket.join(`ticket:${ticketId}`));
    socket.on('leave:ticket', (ticketId) => socket.leave(`ticket:${ticketId}`));
    socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initializeSocket, getIO };
