const express = require('express');
const router = express.Router();
const technicianController = require('../controllers/technicianController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/pending', authenticate, authorize('admin'), technicianController.getPendingTechnicians);
router.get('/stats', authenticate, authorize('admin'), technicianController.getTechnicianStats);
router.get('/', authenticate, authorize('admin'), technicianController.getTechnicians);
router.get('/:id', authenticate, technicianController.getTechnicianById);
router.put('/:id', authenticate, authorize('admin'), technicianController.updateTechnician);
router.post('/:id/approve', authenticate, authorize('admin'), technicianController.approveTechnician);
router.post('/:id/reject', authenticate, authorize('admin'), technicianController.rejectTechnician);
router.post('/:id/suspend', authenticate, authorize('admin'), technicianController.suspendTechnician);
router.put('/:id/status', authenticate, authorize('admin'), technicianController.updateTechnicianStatus);
router.delete('/:id', authenticate, authorize('admin'), technicianController.deleteTechnician);

module.exports = router;
