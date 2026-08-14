/**
 * Rate Limiting Middleware — Converge IT Solutions Ticketing System
 *
 * Tiers:
 *   generalLimiter    — /api/*               200 req / 15 min  (normal usage)
 *   authLimiter       — /auth/login, pin-login, register  10 req / 15 min
 *   aiLimiter         — /ai/recommendations              5 req / 30 min
 *   uploadLimiter     — file upload endpoints            30 req / 60 min
 *   reportLimiter     — /reports, /analytics             60 req / 15 min
 *   passwordLimiter   — /auth/change-password            10 req / 60 min
 *
 * Proxy:
 *   Render and most PaaS providers sit behind a reverse proxy (nginx / Cloudflare).
 *   Without `trust proxy`, ALL users would appear to have the same IP (the proxy IP)
 *   and the first user to hit the limit would block everyone else.
 *   We set `trustProxy: 1` so express-rate-limit reads the real client IP from
 *   the X-Forwarded-For header forwarded by Render's single proxy hop.
 */

const rateLimit = require('express-rate-limit');

const isDevMode = () => process.env.NODE_ENV === 'development';

// ─── Shared JSON error handler ───────────────────────────────────────────────
const makeHandler = (message) => (_req, res) => {
  res.status(429).json({
    success: false,
    message,
    retryAfter: res.getHeader('Retry-After') || null,
  });
};

// ─── General API limiter — applied to all /api/* routes ─────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,         // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  standardHeaders: 'draft-7',       // Sends RateLimit-* headers (RFC-compliant)
  legacyHeaders: false,
  trustProxy: 1,                    // Trust Render's single reverse-proxy hop
  skip: isDevMode,
  handler: makeHandler('Too many requests. Please try again later.'),
});

// ─── Auth limiter — login, pin-login, register-technician ────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,         // 15 minutes
  max: 10,                          // 10 attempts per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  trustProxy: 1,
  skip: isDevMode,
  handler: makeHandler(
    'Too many authentication attempts. Please try again after 15 minutes.'
  ),
});

// ─── AI Recommendations limiter — expensive DB + AI processing ───────────────
const aiLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,         // 30 minutes
  max: 5,                           // 5 requests per 30 min per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  trustProxy: 1,
  skip: isDevMode,
  handler: makeHandler(
    'AI Recommendations limit reached. TanStack Query caches results for 30 minutes — please wait before refreshing manually.'
  ),
});

// ─── File upload limiter ──────────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,         // 1 hour
  max: 30,                          // 30 uploads per hour
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  trustProxy: 1,
  skip: isDevMode,
  handler: makeHandler(
    'Upload limit reached. You may upload up to 30 files per hour. Please try again later.'
  ),
});

// ─── Reports & Analytics limiter — 6 parallel API calls per page load ────────
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,         // 15 minutes
  max: 60,                          // 60 req / 15 min (10 full-page loads)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  trustProxy: 1,
  skip: isDevMode,
  handler: makeHandler(
    'Too many analytics requests. Please try again in a few minutes.'
  ),
});

// ─── Password change limiter ──────────────────────────────────────────────────
const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,         // 1 hour
  max: 10,                          // 10 attempts per hour
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  trustProxy: 1,
  skip: isDevMode,
  handler: makeHandler(
    'Too many password change requests. Please try again in 1 hour.'
  ),
});

module.exports = {
  generalLimiter,
  authLimiter,
  aiLimiter,
  uploadLimiter,
  reportLimiter,
  passwordLimiter,
};
