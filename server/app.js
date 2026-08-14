require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const logger = require('./config/logger');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const customerRoutes = require('./routes/customerRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const messengerRoutes = require('./routes/messengerRoutes');
const aiRoutes = require('./routes/aiRoutes');
const knowledgeBaseRoutes = require('./routes/knowledgeBaseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const serviceReportRoutes = require('./routes/serviceReportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const botcakeRoutes = require('./routes/botcakeRoutes');

const app = express();

// Trust Render's single reverse-proxy hop so rate limiters read real client IPs
// from X-Forwarded-For instead of treating all users as the same IP
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, postman, curl)
    if (!origin) return callback(null, true);

    // Always allow localhost, render.com deployments, vercel, netlify
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.netlify.app')
    ) {
      return callback(null, true);
    }

    const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
    if (envOrigins.includes('*') || envOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Default fallback to allow connection
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/', generalLimiter);

app.get('/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  service: 'Converge IT Solutions Ticketing System'
}));

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/messenger', messengerRoutes);
app.use('/api/botcake', botcakeRoutes);
app.use('/api/webhooks/botcake', botcakeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/service-reports', serviceReportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
