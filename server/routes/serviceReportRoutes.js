const express = require('express');
const router = express.Router();
const serviceReportController = require('../controllers/serviceReportController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadServiceReportImages, uploadSignature } = require('../middleware/upload');

router.get('/', authenticate, serviceReportController.getServiceReports);
router.get('/:id', authenticate, serviceReportController.getServiceReportById);
router.post('/', authenticate, authorize('technician', 'admin'), uploadServiceReportImages, serviceReportController.createServiceReport);
router.put('/:id', authenticate, authorize('technician', 'admin'), serviceReportController.updateServiceReport);
router.post('/:id/signature', authenticate, uploadSignature, serviceReportController.uploadSignature);

module.exports = router;
