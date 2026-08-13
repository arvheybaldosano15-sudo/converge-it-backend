const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin'), customerController.getCustomers);
router.get('/stats', authenticate, authorize('admin'), customerController.getCustomerStats);
router.post('/', authenticate, authorize('admin'), customerController.createCustomer);
router.get('/:id', authenticate, customerController.getCustomerById);
router.put('/:id', authenticate, authorize('admin'), customerController.updateCustomer);
router.delete('/:id', authenticate, authorize('admin'), customerController.deleteCustomer);
router.get('/:id/tickets', authenticate, customerController.getCustomerTickets);
router.get('/:id/messages', authenticate, authorize('admin'), customerController.getCustomerMessages);

module.exports = router;
