const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');

// GET /api/settings - Fetch all settings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM settings ORDER BY key');
    const settings = {};
    result.rows.forEach(row => {
      let val = row.value;
      // If PostgreSQL returned a JSON-encoded string or primitive inside jsonb
      if (typeof val === 'string') {
        try {
          val = JSON.parse(val);
        } catch (e) {
          // Keep as string
        }
      }
      settings[row.key] = val;
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/:key - Upsert setting by key
router.put('/:key', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { value } = req.body;
    const jsonValue = JSON.stringify(value !== undefined ? value : '');
    const result = await query(
      `INSERT INTO settings (key, value, updated_by, updated_at)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
       RETURNING *`,
      [req.params.key, jsonValue, req.user?.id || null]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
