require('dotenv').config();
const { query } = require('../config/database');

async function main() {
  // Check what tables reference users
  const fkRes = await query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users'
  `);
  console.log('Tables referencing users:');
  console.log(JSON.stringify(fkRes.rows, null, 2));

  // Try deleting Bernie Besa manually and capture full error
  const techId = 'e8b1e045-b05a-429a-a679-a6ce970c001c';
  console.log('\nAttempting DELETE for Bernie Besa...');
  try {
    const del = await query("DELETE FROM users WHERE id = $1 AND role = 'technician' RETURNING full_name", [techId]);
    console.log('Delete result:', del.rows);
  } catch (err) {
    console.error('Delete failed:', err.message);
    console.error('Detail:', err.detail);
  }

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
