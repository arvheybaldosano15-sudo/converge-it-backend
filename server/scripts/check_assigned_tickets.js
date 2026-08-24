require('dotenv').config();
const { query } = require('../config/database');

async function main() {
  const tickets = await query(`
    SELECT t.id, t.ticket_number, t.subject, t.status, t.assigned_technician_id, t.created_at,
           u.full_name as technician_name, u.email as technician_email
    FROM tickets t
    LEFT JOIN users u ON t.assigned_technician_id = u.id
    ORDER BY t.created_at DESC
  `);

  console.log('--- ALL TICKETS ---');
  console.log(JSON.stringify(tickets.rows, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
