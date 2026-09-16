require('dotenv').config();
const { query } = require('./config/database');

async function test() {
  try {
    const page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC', excludeCategoryName = 'Installation Request';
    const offset = 0;
    const conditions = []; 
    const params = []; 
    let idx = 1;

    if (excludeCategoryName) {
      conditions.push(`t.service_category_id NOT IN (SELECT id FROM service_categories WHERE name ILIKE $${idx++})`);
      params.push(`%${excludeCategoryName}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const col = 'created_at';
    const ord = 'DESC';
    const dataParams = [...params, parseInt(limit), offset];
    console.log('SQL Params:', dataParams, 'idx before query:', idx);

    const dataSql = `SELECT t.id, t.ticket_number, t.subject, t.description, t.status, t.priority, t.ai_priority_recommendation, t.ai_estimated_resolution_hours,
             t.created_at, t.updated_at, t.sla_deadline, t.resolved_at, t.assigned_technician_id AS assigned_to,
             c.full_name AS customer_name, c.contact_number AS customer_contact, c.complete_address AS customer_address, c.messenger_psid,
             cat.name AS category_name, cat.icon AS category_icon, cat.color_code AS category_color,
             u.full_name AS assignee_name, u.profile_image_url AS assignee_avatar, u.employee_id AS assignee_employee_id
             FROM tickets t
             LEFT JOIN customers c ON t.customer_id = c.id
             LEFT JOIN service_categories cat ON t.service_category_id = cat.id
             LEFT JOIN users u ON t.assigned_technician_id = u.id
             ${where} ORDER BY t.${col} ${ord} LIMIT $${idx++} OFFSET $${idx}`;

    console.log('DATA SQL:', dataSql);

    const countSql = `SELECT COUNT(*) FROM tickets t LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN service_categories cat ON t.service_category_id = cat.id ${where}`;
    console.log('COUNT SQL:', countSql);

    const [data, count] = await Promise.all([
      query(dataSql, dataParams),
      query(countSql, params)
    ]);

    console.log('SUCCESS! ROWS:', data.rows.length, 'COUNT:', count.rows[0].count);
  } catch(e) {
    console.error('QUERY EXCEPTION:', e);
  }
  process.exit(0);
}
test();
