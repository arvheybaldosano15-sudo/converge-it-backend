require('dotenv').config();
const { query } = require('./config/database');

async function main() {
  // Check enum values for notification_type
  const r = await query(`
    SELECT e.enumlabel 
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'notification_type'
  `);
  console.log('ENUM VALUES:', r.rows.map(x => x.enumlabel).join(', '));

  // Try inserting a test notification for the first admin
  const admins = await query("SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
  if (admins.rows.length === 0) { console.log('No admin found'); process.exit(0); }
  const adminId = admins.rows[0].id;
  console.log('Admin ID:', adminId);

  const ins = await query(
    `INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [adminId, 'ticket', 'Test Ticket', 'Test message', null]
  );
  console.log('INSERT SUCCESS:', JSON.stringify(ins.rows[0]));
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
