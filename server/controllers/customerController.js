const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

exports.getCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, filter, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(c.full_name ILIKE $${idx} OR c.contact_number ILIKE $${idx} OR c.account_number ILIKE $${idx} OR c.messenger_psid ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Having clause for table filtering (open tickets, no tickets)
    let havingClause = '';
    if (filter === 'open_tickets') {
      havingClause = `HAVING COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) > 0`;
    } else if (filter === 'no_tickets') {
      havingClause = `HAVING COUNT(t.id) = 0`;
    } else if (filter === 'active') {
      havingClause = `HAVING COUNT(t.id) > 0`;
    }

    // Determine sorting
    let orderBy = 'c.created_at DESC';
    if (sortBy === 'total_tickets' || sortBy === 'most_tickets' || sortBy === 'most_active') {
      orderBy = `total_tickets ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}, c.created_at DESC`;
    } else if (sortBy === 'account_number') {
      orderBy = `c.account_number ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
    } else if (sortBy === 'full_name') {
      orderBy = `c.full_name ${sortOrder === 'DESC' ? 'DESC' : 'ASC'}`;
    } else if (sortBy === 'last_activity') {
      orderBy = `last_activity ${sortOrder === 'ASC' ? 'ASC' : 'DESC'} NULLS LAST`;
    } else {
      orderBy = `c.created_at ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
    }

    const dataParams = [...params, parseInt(limit), offset];

    const [data, count] = await Promise.all([
      query(`SELECT c.id, c.account_number, c.messenger_psid, c.full_name, c.complete_address, c.nearby_landmark, c.contact_number, c.created_at,
             COUNT(t.id) AS total_tickets,
             COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) AS open_tickets,
             MAX(t.created_at) AS last_activity
             FROM customers c LEFT JOIN tickets t ON c.id = t.customer_id
             ${where}
             GROUP BY c.id
             ${havingClause}
             ORDER BY ${orderBy}
             LIMIT $${idx++} OFFSET $${idx}`, dataParams),
      query(`SELECT COUNT(DISTINCT c.id) FROM customers c LEFT JOIN tickets t ON c.id = t.customer_id ${where} ${havingClause ? `GROUP BY c.id ${havingClause}` : ''}`, params)
    ]);

    const totalCount = havingClause ? count.rows.length : parseInt(count.rows[0]?.count || 0);

    res.json({
      success: true,
      data: data.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerStats = async (req, res, next) => {
  try {
    const statsRes = await query(`
      SELECT
        (SELECT COUNT(*) FROM customers) AS total_customers,
        (SELECT COUNT(DISTINCT customer_id) FROM tickets) AS active_customers,
        (SELECT COUNT(DISTINCT customer_id) FROM tickets WHERE status NOT IN ('resolved', 'closed')) AS open_tickets_customers,
        (SELECT COUNT(*) FROM customers WHERE created_at >= NOW() - INTERVAL '30 days') AS new_customers
    `);
    res.json({
      success: true,
      data: statsRes.rows[0] || {
        total_customers: 0,
        active_customers: 0,
        open_tickets_customers: 0,
        new_customers: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerById = async (req, res, next) => {
  try {
    const customerId = req.params.id;

    const [custRes, ticketsRes, timelineRes] = await Promise.all([
      query(`
        SELECT c.*,
               COUNT(t.id) AS total_tickets,
               COUNT(t.id) FILTER (WHERE t.status = 'open') AS open_tickets,
               COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_tickets,
               COUNT(t.id) FILTER (WHERE t.status = 'resolved') AS resolved_tickets,
               COUNT(t.id) FILTER (WHERE t.status = 'closed') AS closed_tickets,
               COUNT(t.id) FILTER (WHERE t.sla_deadline < NOW() AND t.status NOT IN ('resolved','closed')) AS sla_breaches,
               MAX(t.created_at) AS last_activity
        FROM customers c LEFT JOIN tickets t ON c.id = t.customer_id
        WHERE c.id = $1 GROUP BY c.id`, [customerId]),
      query(`
        SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.created_at, t.resolved_at, t.sla_deadline,
               cat.name AS category_name, cat.color_code AS category_color,
               u.full_name AS assignee_name
        FROM tickets t
        LEFT JOIN service_categories cat ON t.service_category_id = cat.id
        LEFT JOIN users u ON t.assigned_technician_id = u.id
        WHERE t.customer_id = $1
        ORDER BY t.created_at DESC
        LIMIT 10`, [customerId]),
      query(`
        SELECT tu.id, tu.ticket_id, tu.status_changed_to, tu.notes, tu.created_at,
               t.ticket_number, u.full_name AS user_name, u.role AS user_role
        FROM ticket_updates tu
        JOIN tickets t ON tu.ticket_id = t.id
        LEFT JOIN users u ON tu.updated_by = u.id
        WHERE t.customer_id = $1
        ORDER BY tu.created_at DESC
        LIMIT 15`, [customerId])
    ]);

    if (!custRes.rows[0]) throw createError('Customer not found', 404);

    res.json({
      success: true,
      data: {
        ...custRes.rows[0],
        recentTickets: ticketsRes.rows || [],
        activityTimeline: timelineRes.rows || []
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { fullName, contactNumber, completeAddress, nearbyLandmark, accountNumber, messengerPsid } = req.body;
    
    if (!fullName || !fullName.trim()) {
      throw createError('Customer full name is required', 400);
    }

    const accNum = accountNumber && accountNumber.trim()
      ? accountNumber.trim()
      : `ACC-${Math.floor(100000 + Math.random() * 900000)}`;

    const result = await query(
      `INSERT INTO customers (account_number, messenger_psid, full_name, complete_address, nearby_landmark, contact_number, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [accNum, messengerPsid || null, fullName.trim(), completeAddress || null, nearbyLandmark || null, contactNumber || null, req.user?.id || null]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Customer created successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const { fullName, contactNumber, completeAddress, nearbyLandmark, accountNumber, messengerPsid } = req.body;
    const updates = [];
    const values = [];
    let i = 1;

    if (fullName !== undefined) { updates.push(`full_name = $${i++}`); values.push(fullName); }
    if (contactNumber !== undefined) { updates.push(`contact_number = $${i++}`); values.push(contactNumber); }
    if (completeAddress !== undefined) { updates.push(`complete_address = $${i++}`); values.push(completeAddress); }
    if (nearbyLandmark !== undefined) { updates.push(`nearby_landmark = $${i++}`); values.push(nearbyLandmark); }
    if (accountNumber !== undefined) { updates.push(`account_number = $${i++}`); values.push(accountNumber); }
    if (messengerPsid !== undefined) { updates.push(`messenger_psid = $${i++}`); values.push(messengerPsid || null); }

    if (updates.length === 0) throw createError('No fields to update', 400);

    values.push(req.params.id);
    const result = await query(`UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`, values);
    
    if (!result.rows[0]) throw createError('Customer not found', 404);
    res.json({ success: true, data: result.rows[0], message: 'Customer updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM customers WHERE id = $1 RETURNING full_name', [req.params.id]);
    if (!result.rows[0]) throw createError('Customer not found', 404);
    res.json({ success: true, message: `Customer ${result.rows[0].full_name} deleted successfully` });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await query(`
      SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.created_at, t.resolved_at, t.sla_deadline,
             cat.name AS category_name, cat.color_code AS category_color,
             u.full_name AS assignee_name
      FROM tickets t
      LEFT JOIN service_categories cat ON t.service_category_id = cat.id
      LEFT JOIN users u ON t.assigned_technician_id = u.id
      WHERE t.customer_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3`, [req.params.id, parseInt(limit), offset]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerMessages = async (req, res, next) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};
