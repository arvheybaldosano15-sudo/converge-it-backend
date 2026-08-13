const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// GET /api/categories - Fetch active service categories
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, description, icon, color_code AS color, sla_hours 
       FROM service_categories 
       ORDER BY name ASC`
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
