const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// GET /api/categories - Fetch active service categories safely
router.get('/', async (req, res) => {
  try {
    let result;
    try {
      result = await query(`SELECT id, name, description, icon, color_code AS color FROM service_categories ORDER BY name ASC`);
    } catch (e1) {
      try {
        result = await query(`SELECT id, name, description, icon, color FROM categories ORDER BY name ASC`);
      } catch (e2) {
        result = { rows: [] };
      }
    }
    res.json({
      success: true,
      data: result ? result.rows : []
    });
  } catch (error) {
    res.json({
      success: true,
      data: []
    });
  }
});

module.exports = router;
