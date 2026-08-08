require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./config/socket');
const { testConnection } = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initializeSocket(server);

const startServer = async () => {
  try {
    await testConnection();
    logger.info('✅ Database connection established successfully');
  } catch (error) {
    logger.warn('⚠️ Could not connect to PostgreSQL database.');
    logger.warn('👉 Please ensure PostgreSQL is running or update DATABASE_URL in server/.env');
    logger.warn('👉 Execute "psql -U postgres -d your_db -f database/schema.sql" to initialize the database.');
  }

  server.listen(PORT, () => {
    logger.info(`🚀 Converge IT Solutions Server running on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  });
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Closing server...');
  server.close(() => { logger.info('Server closed'); process.exit(0); });
});

startServer();
