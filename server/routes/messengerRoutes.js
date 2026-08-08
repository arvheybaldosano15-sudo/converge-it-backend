const express = require('express');
const router = express.Router();
const messengerController = require('../controllers/messengerController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/webhook', messengerController.verifyWebhook);
router.post('/webhook', messengerController.handleWebhook);
router.get('/conversations', authenticate, authorize('admin'), messengerController.getConversations);
router.get('/conversations/:customerId', authenticate, authorize('admin'), messengerController.getConversationMessages);
router.post('/send', authenticate, authorize('admin'), messengerController.sendMessage);

module.exports = router;
