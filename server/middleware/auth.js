const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { createError } = require('./errorHandler');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw createError('No token provided', 401);
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id, full_name, email, role, status, profile_image_url FROM users WHERE id = $1',
      [decoded.id]
    );
    if (!result.rows[0]) throw createError('User not found', 401);
    const user = result.rows[0];
    if (user.status && user.status !== 'active') throw createError('Account is not active', 403);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(createError('Authentication required', 401));
  if (!roles.includes(req.user.role)) return next(createError('Permission denied', 403));
  next();
};

module.exports = { authenticate, authorize };
