const { query } = require('../config/database');
const { emitToUser } = require('./socketService');
const logger = require('../config/logger');

// Actual DB schema: id, user_id, title, message, type, reference_id, is_read, created_at
// Valid type enum values: 'ticket', 'system', 'approval'
exports.createNotification = async ({ userId, type, title, body, message, data }) => {
  try {
    const content = body || message || '';
    const referenceId = data?.ticketId || data?.technicianId || null;
    // Map any logical type to valid DB enum values
    const VALID_TYPES = ['ticket', 'system', 'approval'];
    const dbType = VALID_TYPES.includes(type) ? type : 'ticket';

    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, dbType, title, content, referenceId]
    );

    const notification = result?.rows[0];
    if (notification) {
      emitToUser(userId, 'notification:new', notification);
    }
    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error.message);
  }
};

exports.notifyAdmins = async ({ type, title, body, message, data }) => {
  try {
    const adminRes = await query(`SELECT id FROM users WHERE role = 'admin' AND status = 'active'`);
    const admins = adminRes.rows || [];
    for (const admin of admins) {
      await exports.createNotification({
        userId: admin.id,
        type: type || 'ticket',
        title,
        body: body || message,
        data
      });
    }
  } catch (error) {
    logger.error('Failed to notify admins:', error.message);
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
