const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/stats', authenticate, ticketController.getTicketStats);
router.get('/', authenticate, ticketController.getTickets);
router.get('/:id', authenticate, ticketController.getTicketById);
router.post('/', authenticate, authorize('admin'), ticketController.createTicket);
router.put('/:id', authenticate, ticketController.updateTicket);
router.delete('/:id', authenticate, ticketController.deleteTicket);

module.exports = router;
