const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const aiService = require('../services/aiService');

router.get('/recommendations', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.json({ success: true, data: [], message: 'AI recommendations feature coming soon' });
  } catch (error) { next(error); }
});

router.post('/recommendations/:ticketId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const ticketResult = await query(`SELECT t.*, cat.name AS category_name FROM tickets t LEFT JOIN service_categories cat ON t.service_category_id = cat.id WHERE t.id = $1`, [req.params.ticketId]);
    if (!ticketResult.rows[0]) return next({ statusCode: 404, message: 'Ticket not found' });
    
    const histResult = await query(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric, 2) AS avg_hours FROM tickets WHERE service_category_id = $1 AND status = 'resolved' AND resolved_at IS NOT NULL`, [ticketResult.rows[0].service_category_id]);
    
    let recs = [];
    if (aiService && typeof aiService.getTicketRecommendations === 'function') {
      recs = await aiService.getTicketRecommendations(ticketResult.rows[0], histResult.rows[0]);
    }
    
    res.json({ success: true, data: recs });
  } catch (error) { next(error); }
});

router.put('/recommendations/:id/apply', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    res.status(404).json({ success: false, message: 'Recommendation feature not available' });
  } catch (error) { next(error); }
});

module.exports = router;
