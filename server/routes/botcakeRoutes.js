const express = require('express');
const router = express.Router();
const botcakeController = require('../controllers/botcakeController');

// Botcake Webhook endpoints (no auth needed for Botcake webhooks)
router.get('/webhook', botcakeController.verifyWebhook);
router.post('/webhook', botcakeController.handleWebhook);

// Account number verification endpoint (called from Botcake flow)
router.get('/verify', botcakeController.verifyAccountNumber);
router.get('/webhook/verify', botcakeController.verifyAccountNumber);
router.post('/verify', botcakeController.verifyAccountNumber);

// DIAGNOSTIC: Always returns found=true (used to test if Condition #1 is working)
router.get('/test-always-found', (req, res) => {
  res.json({ success: true, found: true, found_str: "true", status: "found" });
});

module.exports = router;
