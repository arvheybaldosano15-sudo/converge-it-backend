const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

exports.getCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = []; const params = []; let idx = 1;
    if (search) { conditions.push(`(c.full_name ILIKE $${idx} OR c.contact_number ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const dataParams = [...params, parseInt(limit), offset];
    const [data, count] = await Promise.all([
      query(`SELECT c.id, c.account_number, c.messenger_psid, c.full_name, c.complete_address, c.nearby_landmark, c.contact_number, c.created_at,
             COUNT(t.id) AS total_tickets, COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) AS open_tickets
             FROM customers c LEFT JOIN tickets t ON c.id = t.customer_id
             ${where} GROUP BY c.id ORDER BY c.${sortBy} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}
             LIMIT $${idx++} OFFSET $${idx}`, dataParams),
      query(`SELECT COUNT(*) FROM customers c ${where}`, params)
    ]);
    res.json({ success: true, data: data.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count.rows[0].count), totalPages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)) } });
  } catch (error) { next(error); }
};

exports.getCustomerById = async (req, res, next) => {
  try {
    const result = await query(`SELECT c.*, COUNT(t.id) AS total_tickets, ROUND(AVG(f.rating)::numeric, 2) AS avg_satisfaction
      FROM customers c LEFT JOIN tickets t ON c.id = t.customer_id LEFT JOIN feedback f ON t.id = f.ticket_id
      WHERE c.id = $1 GROUP BY c.id`, [req.params.id]);
    if (!result.rows[0]) throw createError('Customer not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const { fullName, contactNumber, completeAddress, nearbyLandmark } = req.body;
    const updates = []; const values = []; let i = 1;
    if (fullName) { updates.push(`full_name = $${i++}`); values.push(fullName); }
    if (contactNumber) { updates.push(`contact_number = $${i++}`); values.push(contactNumber); }
    if (completeAddress) { updates.push(`complete_address = $${i++}`); values.push(completeAddress); }
    if (nearbyLandmark !== undefined) { updates.push(`nearby_landmark = $${i++}`); values.push(nearbyLandmark); }
    if (updates.length === 0) throw createError('No fields to update', 400);
    values.push(req.params.id);
    const result = await query(`UPDATE customers SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
    if (!result.rows[0]) throw createError('Customer not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { fullName, contactNumber, completeAddress, nearbyLandmark, accountNumber, messengerPsid } = req.body;
    const accNum = accountNumber || `ACC-${Math.floor(100000 + Math.random() * 900000)}`;
    const result = await query(
      `INSERT INTO customers (account_number, messenger_psid, full_name, complete_address, nearby_landmark, contact_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [accNum, messengerPsid || null, fullName, completeAddress || null, nearbyLandmark || null, contactNumber || null, req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Customer created successfully' });
  } catch (error) { next(error); }
};

exports.getCustomerTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await query(`
      SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.created_at, t.resolved_at,
             cat.name AS category_name, cat.color_code AS category_color,
             u.full_name AS assignee_name
      FROM tickets t LEFT JOIN service_categories cat ON t.service_category_id = cat.id LEFT JOIN users u ON t.assigned_technician_id = u.id
      WHERE t.customer_id = $1 ORDER BY t.created_at DESC LIMIT $2 OFFSET $3`, [req.params.id, parseInt(limit), offset]);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

exports.getCustomerMessages = async (req, res, next) => {
  try {
    // messages table does not exist
    res.json({ success: true, data: [] });
  } catch (error) { next(error); }
};

