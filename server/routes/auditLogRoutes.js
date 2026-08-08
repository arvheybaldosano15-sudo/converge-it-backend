const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');

// GET /api/audit-logs
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate, actorId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = []; const params = []; let idx = 1;
    if (action) { conditions.push(`action = $${idx++}`); params.push(action); }
    if (actorId) { conditions.push(`actor_id = $${idx++}`); params.push(actorId); }
    if (startDate) { conditions.push(`created_at >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`created_at <= $${idx++}`); params.push(endDate); }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [data, count] = await Promise.all([
      query(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`, [...params, parseInt(limit), offset]),
      query(`SELECT COUNT(*) FROM audit_logs ${where}`, params)
    ]);
    res.json({ success: true, data: data.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count.rows[0].count), totalPages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)) } });
  } catch (error) { next(error); }
});

module.exports = router;
