require('dotenv').config();
const { query } = require('../config/database');

async function checkDetails() {
  console.log('--- USERS ---');
  const u = await query("SELECT id, full_name, email, role, employee_id FROM users WHERE role = 'technician'");
  console.table(u.rows);

  console.log('--- TICKETS & ASSIGNEE ---');
  const t = await query(`
    SELECT t.id, t.ticket_number, t.subject, t.status, t.assigned_technician_id,
           u.full_name as assigned_technician_name, u.email as assigned_technician_email
    FROM tickets t
    LEFT JOIN users u ON t.assigned_technician_id = u.id
    ORDER BY t.created_at DESC
  `);
  console.table(t.rows);

  process.exit(0);
}

checkDetails().catch(e => { console.error(e); process.exit(1); });
