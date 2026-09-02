const { query } = require('../config/database');
const { emitToUser, emitToAdmins } = require('./socketService');
const logger = require('../config/logger');

exports.createNotification = async ({ userId, type, title, body, message, data }) => {
  try {
    const content = body || message || '';
    const referenceId = data?.ticketId || data?.technicianId || null;
    const validData = data ? (typeof data === 'object' ? JSON.stringify(data) : data) : null;
    
    let result;
    try {
      result = await query(
        `INSERT INTO notifications (user_id, type, title, body, data)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, type || 'system', title, content, validData]
      );
    } catch (dbErr) {
      // Fallback in case schema uses message & reference_id
      try {
        result = await query(
          `INSERT INTO notifications (user_id, type, title, message, reference_id)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [userId, type || 'system', title, content, referenceId]
        );
      } catch (err2) {
        logger.error('Failed to insert notification:', dbErr.message, err2.message);
        return null;
      }
    }

    const notification = result?.rows[0];
    if (notification) {
      emitToUser(userId, 'notification:new', notification);
    }
    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error);
  }
};

exports.notifyAdmins = async ({ type, title, body, message, data }) => {
  try {
    const adminRes = await query(`SELECT id FROM users WHERE role = 'admin' AND status = 'active'`);
    const admins = adminRes.rows || [];
    for (const admin of admins) {
      await exports.createNotification({
        userId: admin.id,
        type: type || 'ticket_created',
        title,
        body: body || message,
        data
      });
    }
  } catch (error) {
    logger.error('Failed to notify admins:', error);
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
