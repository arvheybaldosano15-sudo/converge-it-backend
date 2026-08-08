const { Pool } = require('pg');
const logger = require('./logger');

let pool;

const getPool = () => {
  if (!pool) {
    const config = process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
          max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'converge_ticketing',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD,
          ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
          max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000
        };
    pool = new Pool(config);
    pool.on('error', (err) => logger.error('Unexpected database error:', err));
  }
  return pool;
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) logger.warn('Slow query detected', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error:', { text: text.substring(0, 100), error: error.message });
    throw error;
  }
};

const getClient = async () => await getPool().connect();

const testConnection = async () => {
  const result = await query('SELECT NOW() as current_time');
  logger.info('Database time:', result.rows[0].current_time);
  return result;
};

module.exports = { query, getClient, getPool, testConnection };
