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

  // Auto-repair set_sla_due_date PostgreSQL function if it has invalid table/column references
  try {
    await query(`
      CREATE OR REPLACE FUNCTION set_sla_due_date()
      RETURNS TRIGGER AS $$
      DECLARE
          sla_hours INTEGER := 24;
      BEGIN
          IF NEW.priority = 'critical' THEN sla_hours := 4;
          ELSIF NEW.priority = 'high' THEN sla_hours := 8;
          ELSIF NEW.priority = 'medium' THEN sla_hours := 24;
          ELSE sla_hours := 72;
          END IF;
          
          NEW.sla_deadline := NOW() + (sla_hours || ' hours')::INTERVAL;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    logger.info('✅ Database function set_sla_due_date updated/repaired successfully');
  } catch (err) {
    logger.warn('Could not auto-repair set_sla_due_date function:', err.message);
  }

  return result;
};

module.exports = { query, getClient, getPool, testConnection };
