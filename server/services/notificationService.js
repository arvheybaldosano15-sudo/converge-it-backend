const { query } = require('../config/database');
const { emitToUser } = require('./socketService');
const logger = require('../config/logger');

exports.createNotification = async ({ userId, type, title, body, data }) => {
  try {
    const referenceId = data?.ticketId || data?.technicianId || null;
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, type, title, body, referenceId]
    );
    const notification = result.rows[0];
    emitToUser(userId, 'notification:new', notification);
    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error);
  }
};

exports.markAsRead = async (notificationId, userId) =>
  query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [notificationId, userId]);

exports.markAllAsRead = async (userId) =>
  query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);

exports.getUnreadCount = async (userId) => {
  const result = await query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE', [userId]);
  return parseInt(result.rows[0].count);
};
