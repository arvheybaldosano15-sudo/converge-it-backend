const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAuditMemoryLogs } = require('../services/auditService');

// GET /api/audit-logs - Serve from local memory logs (zero Supabase egress)
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate, actorId } = req.query;
    let logs = getAuditMemoryLogs();

    if (action) {
      logs = logs.filter((l) => l.action === action);
    }
    if (actorId) {
      logs = logs.filter((l) => l.actor_id === actorId || l.performed_by === actorId);
    }
    if (startDate) {
      logs = logs.filter((l) => new Date(l.created_at) >= new Date(startDate));
    }
    if (endDate) {
      logs = logs.filter((l) => new Date(l.created_at) <= new Date(endDate));
    }

    const total = logs.length;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const offset = (pageNum - 1) * limitNum;
    const paginated = logs.slice(offset, offset + limitNum);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
