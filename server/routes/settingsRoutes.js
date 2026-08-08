const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const result = await query(isAdmin ? 'SELECT * FROM system_settings ORDER BY key' : 'SELECT * FROM system_settings WHERE is_public = TRUE ORDER BY key');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
});

router.put('/:key', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { value } = req.body;
    const result = await query(`UPDATE system_settings SET value = $1, updated_by = $2, updated_at = NOW() WHERE key = $3 RETURNING *`, [value, req.user.id, req.params.key]);
    if (!result.rows[0]) throw { statusCode: 404, message: 'Setting not found' };
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
});

module.exports = router;
