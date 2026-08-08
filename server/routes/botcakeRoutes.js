const express = require('express');
const router = express.Router();
const botcakeController = require('../controllers/botcakeController');

// Botcake Webhook endpoints (no auth needed for Botcake webhooks)
router.get('/webhook', botcakeController.verifyWebhook);
router.post('/webhook', botcakeController.handleWebhook);

module.exports = router;
