require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const res = await pool.query(
    "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position"
  );
  let current = '';
  res.rows.forEach(r => {
    if (r.table_name !== current) { current = r.table_name; console.log('\nTABLE: ' + r.table_name); }
    console.log('  - ' + r.column_name + ' (' + r.data_type + ')');
  });
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
