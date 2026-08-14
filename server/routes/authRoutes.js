const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, passwordLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { uploadProfileImage } = require('../middleware/upload');

router.post('/login', authLimiter, authController.login);
router.post('/pin-login', authLimiter, authController.pinLogin);
router.post('/register-technician', authLimiter, authController.registerTechnician);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/change-password', authenticate, passwordLimiter, authController.changePassword);
router.put('/profile', authenticate, uploadLimiter, uploadProfileImage, authController.updateProfile);

module.exports = router;

