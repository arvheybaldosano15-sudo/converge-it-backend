const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');

// Cache-Control for GET-only ticket list endpoints (30s browser cache + 60s stale-while-revalidate)
// This dramatically reduces perceived load time on mobile hard refresh without needing a server round-trip
const cacheTicketList = (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  }
  next();
};

router.get('/stats', authenticate, cacheTicketList, ticketController.getTicketStats);
router.get('/', authenticate, cacheTicketList, ticketController.getTickets);
router.get('/:id', authenticate, ticketController.getTicketById);
router.post('/', authenticate, authorize('admin'), ticketController.createTicket);
router.put('/:id', authenticate, ticketController.updateTicket);
router.delete('/:id', authenticate, ticketController.deleteTicket);

module.exports = router;
