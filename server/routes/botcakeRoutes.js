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

module.exports = router;
