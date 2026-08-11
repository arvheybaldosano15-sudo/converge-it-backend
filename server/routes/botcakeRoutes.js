const express = require('express');
const router = express.Router();
const botcakeController = require('../controllers/botcakeController');

// x-api-key guard for routes called by Botcake flows
const guard = botcakeController.validateIncomingApiKey;

// Botcake Webhook endpoints (no auth — Botcake verifies these itself)
router.get('/webhook', botcakeController.verifyWebhook);
router.post('/webhook', botcakeController.handleWebhook);

// Account number verification endpoint (called from Botcake flow, protected by x-api-key)
router.get('/verify', guard, botcakeController.verifyAccountNumber);
router.get('/webhook/verify', guard, botcakeController.verifyAccountNumber);
router.post('/verify', guard, botcakeController.verifyAccountNumber);

// verify-and-broadcast: verifies account + emits real-time event to admin dashboard
router.get('/verify-and-broadcast', guard, botcakeController.verifyAndBroadcast);
router.post('/verify-and-broadcast', guard, botcakeController.verifyAndBroadcast);

// DEBUG route (no guard so you can check from browser)
router.get('/debug-logs', botcakeController.getDebugLogs);

// DIAGNOSTIC: Always returns found=true (used to test Botcake conditions)
router.get('/test-always-found', (req, res) => {
  res.json({ success: true, found: true, found_str: 'true', status: 'found' });
});

module.exports = router;
