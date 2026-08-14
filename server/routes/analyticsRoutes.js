const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimiter');

router.get('/overview', authenticate, authorize('admin'), reportLimiter, analyticsController.getOverview);
router.get('/tickets-trend', authenticate, authorize('admin'), reportLimiter, analyticsController.getTicketsTrend);
router.get('/category-breakdown', authenticate, authorize('admin'), reportLimiter, analyticsController.getCategoryBreakdown);
router.get('/technician-performance', authenticate, authorize('admin'), reportLimiter, analyticsController.getTechnicianPerformance);
router.get('/response-times', authenticate, authorize('admin'), reportLimiter, analyticsController.getResponseTimes);
router.get('/sla-performance', authenticate, authorize('admin'), reportLimiter, analyticsController.getSlaPerformance);
router.get('/satisfaction-scores', authenticate, authorize('admin'), reportLimiter, analyticsController.getSatisfactionScores);

module.exports = router;

