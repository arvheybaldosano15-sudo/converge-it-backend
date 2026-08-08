const { getIO } = require('../config/socket');
const logger = require('../config/logger');

const safeEmit = (emitFn) => {
  try { emitFn(); } catch (error) { logger.warn('Socket emit failed (server may not be ready):', error.message); }
};

exports.emitToUser = (userId, event, data) => safeEmit(() => getIO().to(`user:${userId}`).emit(event, data));
exports.emitToAdmins = (event, data) => safeEmit(() => getIO().to('admins').emit(event, data));
exports.emitToRoom = (room, event, data) => safeEmit(() => getIO().to(room).emit(event, data));
exports.emitToAll = (event, data) => safeEmit(() => getIO().emit(event, data));
