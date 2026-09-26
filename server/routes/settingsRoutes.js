const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { uploadLogo } = require('../middleware/upload');

// GET /api/settings - Fetch all settings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM settings ORDER BY key');
    const settings = {};
    result.rows.forEach(row => {
      let val = row.value;
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

// POST /api/settings/upload-logo - Upload company logo
router.post('/upload-logo', authenticate, authorize('admin'), uploadLogo, async (req, res, next) => {
  try {
    if (!req.file) {
      throw { statusCode: 400, message: 'No logo image file provided' };
    }
    const b64 = req.file.buffer.toString('base64');
    const mime = req.file.mimetype;
    const dataUrl = `data:${mime};base64,${b64}`;

    const jsonValue = JSON.stringify(dataUrl);
    await query(
      `INSERT INTO settings (key, value, updated_by, updated_at)
       VALUES ('company_logo', $1::jsonb, $2, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [jsonValue, req.user?.id || null]
    );

    res.json({ success: true, data: { company_logo: dataUrl } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings - Bulk upsert all settings in a single request
router.put('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      throw { statusCode: 400, message: 'Settings payload object is required' };
    }

    const userId = req.user?.id || null;
    const updatedSettings = {};

    for (const [key, val] of Object.entries(settings)) {
      const jsonValue = JSON.stringify(val !== undefined ? val : '');
      const result = await query(
        `INSERT INTO settings (key, value, updated_by, updated_at)
         VALUES ($1, $2::jsonb, $3, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
         RETURNING *`,
        [key, jsonValue, userId]
      );
      let resVal = result.rows[0].value;
      if (typeof resVal === 'string') {
        try { resVal = JSON.parse(resVal); } catch (e) {}
      }
      updatedSettings[key] = resVal;
    }

    res.json({ success: true, data: updatedSettings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/:key - Single setting upsert fallback
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
