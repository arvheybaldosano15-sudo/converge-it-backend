const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/overview', authenticate, authorize('admin'), analyticsController.getOverview);
router.get('/tickets-trend', authenticate, authorize('admin'), analyticsController.getTicketsTrend);
router.get('/category-breakdown', authenticate, authorize('admin'), analyticsController.getCategoryBreakdown);
router.get('/technician-performance', authenticate, authorize('admin'), analyticsController.getTechnicianPerformance);
router.get('/response-times', authenticate, authorize('admin'), analyticsController.getResponseTimes);
router.get('/sla-performance', authenticate, authorize('admin'), analyticsController.getSlaPerformance);
router.get('/satisfaction-scores', authenticate, authorize('admin'), analyticsController.getSatisfactionScores);

module.exports = router;
