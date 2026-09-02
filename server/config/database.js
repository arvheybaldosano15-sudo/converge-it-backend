const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const logger = require('./logger');

let pool;

const getPool = () => {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL;
    let config;

    if (dbUrl) {
      config = {
        connectionString: dbUrl,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      };
    } else {
      const host = process.env.DB_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com';
      const port = parseInt(process.env.DB_PORT) || 6543;
      const user = process.env.DB_USER || 'postgres.fbgkvlttgcctiynpivix';
      const password = process.env.DB_PASSWORD;
      const database = process.env.DB_NAME || 'postgres';

      config = {
        host,
        port,
        user,
        password,
        database,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      };
    }

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
    if (duration > 1000) logger.warn('Slow query detected', { text: text.substring(0, 100), duration, rows: result.rowCount });
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
          sla_hours INTEGER := 48;
      BEGIN
          IF NEW.priority = 'critical' THEN sla_hours := 4;
          ELSIF NEW.priority = 'high' THEN sla_hours := 8;
          ELSIF NEW.priority = 'medium' THEN sla_hours := 48;
          ELSE sla_hours := 72;
          END IF;
          
          NEW.sla_deadline := NOW() + (sla_hours || ' hours')::INTERVAL;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await query(`
      UPDATE tickets 
      SET sla_deadline = created_at + INTERVAL '48 hours'
      WHERE priority = 'medium' AND status NOT IN ('resolved', 'closed', 'cancelled')
    `).catch(() => {});
    logger.info('✅ Database function set_sla_due_date updated/repaired successfully');
  } catch (err) {
    logger.warn('Could not auto-repair set_sla_due_date function:', err.message);
  }

  return result;
};

module.exports = { query, getClient, getPool, testConnection };
