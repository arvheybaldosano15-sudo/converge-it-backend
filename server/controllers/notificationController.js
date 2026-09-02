const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// Actual DB schema: id, user_id, title, message, type, reference_id, is_read, created_at

exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [`user_id = $1`];
    const params = [req.user.id];
    let idx = 2;
    if (unreadOnly === 'true') { conditions.push(`is_read = FALSE`); }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const [data, count] = await Promise.all([
      query(`SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`, [...params, parseInt(limit), offset]),
      query(`SELECT COUNT(*) FROM notifications ${where}`, params)
    ]);
    res.json({ success: true, data: data.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count.rows[0].count) } });
  } catch (error) { next(error); }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const result = await query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
    res.json({ success: true, data: { count: parseInt(result.rows[0].count) } });
  } catch (error) { next(error); }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) throw createError('Notification not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rowCount === 0) throw createError('Notification not found', 404);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) { next(error); }
};
