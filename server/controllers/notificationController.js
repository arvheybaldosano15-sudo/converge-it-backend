const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const pushService = require('../services/pushService');

// Actual DB schema: id, user_id, title, message, type, reference_id, is_read, created_at

const syncPendingTechnicianNotifications = async (userId, role) => {
  if (role !== 'admin') return;
  try {
    const pendingTechs = await query(`
      SELECT id, full_name, employee_id, created_at
      FROM users
      WHERE role = 'technician' AND status = 'pending'
    `);
    for (const tech of pendingTechs.rows) {
      const existing = await query(
        `SELECT id FROM notifications WHERE user_id = $1 AND type = 'approval' AND reference_id = $2`,
        [userId, tech.id]
      );
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO notifications (user_id, title, message, type, reference_id, is_read, created_at)
           VALUES ($1, $2, $3, 'approval', $4, FALSE, $5)`,
          [
            userId,
            'Pending Technician Approval',
            `New technician ${tech.full_name} (${tech.employee_id}) registered and is awaiting administrator approval.`,
            tech.id,
            tech.created_at || new Date()
          ]
        );
      }
    }
  } catch (err) {
    console.error('Error auto-syncing pending tech notifications:', err);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    await syncPendingTechnicianNotifications(req.user.id, req.user.role);

    const { page = 1, limit = 20, unreadOnly } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [`n.user_id = $1`];
    const params = [req.user.id];
    let idx = 2;
    if (unreadOnly === 'true') { conditions.push(`n.is_read = FALSE`); }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const [data, count] = await Promise.all([
      query(`
        SELECT n.*,
               t.ticket_number,
               t.subject AS ticket_subject,
               cat.name AS category_name
        FROM notifications n
        LEFT JOIN tickets t ON n.reference_id = t.id
        LEFT JOIN service_categories cat ON t.service_category_id = cat.id
        ${where}
        ORDER BY n.created_at DESC
        LIMIT $${idx++} OFFSET $${idx}
      `, [...params, parseInt(limit), offset]),
      query(`SELECT COUNT(*) FROM notifications n ${where}`, params)
    ]);
    res.json({ success: true, data: data.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count.rows[0].count) } });
  } catch (error) { next(error); }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    await syncPendingTechnicianNotifications(req.user.id, req.user.role);
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

// Return VAPID Public Key for Web Push client registration
exports.getVapidKey = async (req, res, next) => {
  try {
    const publicKey = pushService.getPublicKey();
    res.json({ success: true, publicKey });
  } catch (error) { next(error); }
};

// Register client Push Subscription
exports.subscribePush = async (req, res, next) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      throw createError('Subscription object is required', 400);
    }
    const userAgent = req.headers['user-agent'] || '';
    const record = await pushService.saveSubscription(req.user.id, subscription, userAgent);
    res.status(201).json({ success: true, data: record, message: 'Mobile push subscription registered successfully' });
  } catch (error) { next(error); }
};
