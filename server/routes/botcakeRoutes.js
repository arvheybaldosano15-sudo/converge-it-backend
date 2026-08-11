const express = require('express');
const router = express.Router();
const botcakeController = require('../controllers/botcakeController');

// Botcake Webhook endpoints (no auth — Botcake verifies these itself)
router.get('/webhook', botcakeController.verifyWebhook);
router.post('/webhook', botcakeController.handleWebhook);

// Account number verification endpoint (called from Botcake flow)
router.get('/verify', botcakeController.verifyAccountNumber);
router.get('/webhook/verify', botcakeController.verifyAccountNumber);
router.post('/verify', botcakeController.verifyAccountNumber);

// verify-and-broadcast: verifies account + emits real-time event to admin dashboard
router.get('/verify-and-broadcast', botcakeController.verifyAndBroadcast);
router.post('/verify-and-broadcast', botcakeController.verifyAndBroadcast);

// create-ticket: creates AI ticket directly from Botcake HTTP action node
router.get('/create-ticket', botcakeController.createTicket);
router.post('/create-ticket', botcakeController.createTicket);

// DEBUG route
router.get('/debug-logs', botcakeController.getDebugLogs);

// DIAGNOSTIC: Always returns found=true (used to test Botcake conditions)
router.get('/test-always-found', (req, res) => {
  res.json({ success: true, found: true, found_str: 'true', status: 'found' });
});

module.exports = router;

