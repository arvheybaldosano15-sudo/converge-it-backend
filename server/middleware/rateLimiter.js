const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true, legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes' },
  standardHeaders: true, legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 50,
  message: { success: false, message: 'Too many upload requests' },
  skip: () => process.env.NODE_ENV === 'development'
});

module.exports = { generalLimiter, authLimiter, uploadLimiter };

