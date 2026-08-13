const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { emitToAdmins } = require('../services/socketService');

exports.getTechnicians = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, specialization, workload, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["u.role = 'technician'"];
    const params = [];
    let idx = 1;

    if (status && status !== 'all') {
      if (status === 'active' || status === 'approved') {
        conditions.push(`u.status = 'active'`);
      } else if (status === 'pending') {
        conditions.push(`u.status = 'pending'`);
      } else if (status === 'inactive' || status === 'rejected') {
        conditions.push(`u.status IN ('inactive', 'rejected')`);
      } else {
        conditions.push(`u.status = $${idx++}`);
        params.push(status);
      }
    }

    if (specialization && specialization !== 'all') {
      conditions.push(`u.specialization ILIKE $${idx++}`);
      params.push(`%${specialization}%`);
    }

    if (search && search.trim() !== '') {
      conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.employee_id ILIKE $${idx} OR u.specialization ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const dataParams = [...params, parseInt(limit), offset];

    let orderBy = 'u.created_at DESC';
    if (sortBy === 'full_name' || sortBy === 'name') {
      orderBy = `u.full_name ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
    } else if (sortBy === 'active_tickets' || sortBy === 'workload') {
      orderBy = `active_tickets ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}, u.full_name ASC`;
    } else if (sortBy === 'completed_tickets') {
      orderBy = `completed_tickets ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
    } else if (sortBy === 'last_login_at' || sortBy === 'recently_active') {
      orderBy = `u.last_login_at ${sortOrder === 'ASC' ? 'ASC' : 'DESC'} NULLS LAST`;
    } else {
      orderBy = `u.created_at ${sortOrder === 'ASC' ? 'ASC' : 'DESC'}`;
    }

    // Having clause for workload filtering
    let havingClause = '';
    if (workload === 'available') {
      havingClause = `HAVING COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) <= 1`;
    } else if (workload === 'normal') {
      havingClause = `HAVING COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) BETWEEN 1 AND 2`;
    } else if (workload === 'busy') {
      havingClause = `HAVING COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) = 3`;
    } else if (workload === 'overloaded') {
      havingClause = `HAVING COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) > 3`;
    }

    const [data, count] = await Promise.all([
      query(
        `SELECT u.id, u.employee_id, u.full_name, u.email, u.contact_number, u.status, u.profile_image_url, u.specialization, u.department, u.last_login_at, u.created_at,
                COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) AS active_tickets,
                COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed')) AS completed_tickets,
                COUNT(t.id) AS total_tickets
         FROM users u 
         LEFT JOIN tickets t ON u.id = t.assigned_technician_id
         ${where} 
         GROUP BY u.id
         ${havingClause}
         ORDER BY ${orderBy}
         LIMIT $${idx++} OFFSET $${idx}`,
        dataParams
      ),
      query(`SELECT COUNT(DISTINCT u.id) FROM users u LEFT JOIN tickets t ON u.id = t.assigned_technician_id ${where} ${havingClause ? `GROUP BY u.id ${havingClause}` : ''}`, params)
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

exports.getTechnicianStats = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.id, u.status,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) AS active_tasks
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_technician_id
      WHERE u.role = 'technician'
      GROUP BY u.id, u.status
    `);

    const rows = result.rows || [];
    const total_technicians = rows.length;
    const active_technicians = rows.filter(r => r.status === 'active' || r.status === 'approved').length;
    const available_technicians = rows.filter(r => (r.status === 'active' || r.status === 'approved') && parseInt(r.active_tasks) <= 1).length;
    const active_task_technicians = rows.filter(r => (r.status === 'active' || r.status === 'approved') && parseInt(r.active_tasks) > 0).length;
    const overloaded_technicians = rows.filter(r => (r.status === 'active' || r.status === 'approved') && parseInt(r.active_tasks) > 3).length;

    res.json({
      success: true,
      data: {
        total_technicians,
        active_technicians,
        available_technicians,
        active_task_technicians,
        overloaded_technicians
      }
    });
  } catch (error) {
    console.error('getTechnicianStats error:', error);
    res.json({
      success: true,
      data: {
        total_technicians: 0,
        active_technicians: 0,
        available_technicians: 0,
        active_task_technicians: 0,
        overloaded_technicians: 0
      }
    });
  }
};

exports.getPendingTechnicians = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.id, u.employee_id, u.full_name, u.email, u.contact_number, u.address, u.specialization, u.department, u.status, u.created_at 
      FROM users u 
      WHERE u.role = 'technician' AND u.status IN ('pending', 'rejected', 'inactive', 'active') 
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.getTechnicianById = async (req, res, next) => {
  try {
    const techId = req.params.id;

    const [techRes, ticketsRes, timelineRes] = await Promise.all([
      query(
        `SELECT u.id, u.employee_id, u.full_name, u.email, u.contact_number, u.address, u.profile_image_url, u.specialization, u.department, u.status, u.last_login_at, u.created_at,
                COUNT(t.id) AS total_tickets,
                COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) AS active_tickets,
                COUNT(t.id) FILTER (WHERE t.status = 'open') AS open_tickets,
                COUNT(t.id) FILTER (WHERE t.status = 'in_progress') AS in_progress_tickets,
                COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed')) AS completed_tickets,
                COUNT(t.id) FILTER (WHERE t.sla_deadline < NOW() AND t.status NOT IN ('resolved','closed')) AS sla_breaches,
                ROUND(AVG(f.rating)::numeric, 2) AS avg_satisfaction
         FROM users u 
         LEFT JOIN tickets t ON u.id = t.assigned_technician_id 
         LEFT JOIN feedback f ON t.id = f.ticket_id
         WHERE u.id = $1 AND u.role = 'technician' 
         GROUP BY u.id`,
        [techId]
      ),
      query(`
        SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.created_at, t.resolved_at, t.sla_deadline,
               cat.name AS category_name, cat.color_code AS category_color,
               c.full_name AS customer_name
        FROM tickets t
        LEFT JOIN service_categories cat ON t.service_category_id = cat.id
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.assigned_technician_id = $1
        ORDER BY t.created_at DESC
        LIMIT 10`, [techId]),
      query(`
        SELECT tu.id, tu.ticket_id, tu.status_changed_to, tu.notes, tu.created_at,
               t.ticket_number, u.full_name AS user_name
        FROM ticket_updates tu
        JOIN tickets t ON tu.ticket_id = t.id
        LEFT JOIN users u ON tu.updated_by = u.id
        WHERE t.assigned_technician_id = $1 OR tu.updated_by = $1
        ORDER BY tu.created_at DESC
        LIMIT 15`, [techId])
    ]);

    if (!techRes.rows[0]) throw createError('Technician not found', 404);

    const tech = techRes.rows[0];
    const total = parseInt(tech.total_tickets) || 0;
    const completed = parseInt(tech.completed_tickets) || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    res.json({
      success: true,
      data: {
        ...tech,
        completion_rate: completionRate,
        assignedTickets: ticketsRes.rows || [],
        activityTimeline: timelineRes.rows || []
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTechnician = async (req, res, next) => {
  try {
    const { fullName, email, contactNumber, specialization, department, status } = req.body;
    const updates = [];
    const values = [];
    let i = 1;

    if (fullName !== undefined) { updates.push(`full_name = $${i++}`); values.push(fullName); }
    if (email !== undefined) { updates.push(`email = $${i++}`); values.push(email); }
    if (contactNumber !== undefined) { updates.push(`contact_number = $${i++}`); values.push(contactNumber); }
    if (specialization !== undefined) { updates.push(`specialization = $${i++}`); values.push(specialization); }
    if (department !== undefined) { updates.push(`department = $${i++}`); values.push(department); }
    if (status !== undefined) { updates.push(`status = $${i++}`); values.push(status); }

    if (updates.length === 0) throw createError('No fields to update', 400);

    values.push(req.params.id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${i} AND role = 'technician' RETURNING *`,
      values
    );

    if (!result.rows[0]) throw createError('Technician not found', 404);
    res.json({ success: true, data: result.rows[0], message: 'Technician updated successfully' });
  } catch (error) {
    next(error);
  }
};

exports.approveTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE users SET status = 'active' WHERE id = $1 AND role = 'technician' RETURNING id, full_name, email, employee_id`,
      [id]
    );
    if (!result.rows[0]) throw createError('Technician not found or already processed', 404);
    const tech = result.rows[0];

    await createNotification({
      userId: id,
      type: 'technician_approved',
      title: 'Account Approved',
      body: 'Your technician account has been approved. You can now log in using your PIN.',
      data: {}
    });
    await logAudit({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'approve',
      targetType: 'user',
      targetId: id,
      targetDescription: tech.full_name
    });
    emitToAdmins('technician:approved', { technicianId: id, fullName: tech.full_name });

    res.json({ success: true, data: tech, message: `${tech.full_name} has been approved` });
  } catch (error) {
    next(error);
  }
};

exports.rejectTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await query(
      `UPDATE users SET status = 'rejected' WHERE id = $1 AND role = 'technician' RETURNING id, full_name, email`,
      [id]
    );
    if (!result.rows[0]) throw createError('Technician not found', 404);
    const tech = result.rows[0];

    await createNotification({
      userId: id,
      type: 'technician_rejected',
      title: 'Account Not Approved',
      body: reason || 'Your account application was not approved. Please contact the administrator.',
      data: { reason }
    });
    await logAudit({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'reject',
      targetType: 'user',
      targetId: id,
      targetDescription: tech.full_name
    });

    res.json({ success: true, message: `${tech.full_name}'s application has been rejected` });
  } catch (error) {
    next(error);
  }
};

exports.suspendTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await query(
      `UPDATE users SET status = 'inactive' WHERE id = $1 AND role = 'technician' RETURNING id, full_name, email`,
      [id]
    );
    if (!result.rows[0]) throw createError('Technician not found', 404);
    const tech = result.rows[0];

    await createNotification({
      userId: id,
      type: 'system',
      title: 'Account Suspended',
      body: reason || 'Your technician account has been suspended by the administrator.',
      data: { reason }
    });
    await logAudit({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'update',
      targetType: 'user',
      targetId: id,
      targetDescription: `Suspended technician: ${tech.full_name}`
    });

    res.json({ success: true, message: `${tech.full_name}'s account has been suspended` });
  } catch (error) {
    next(error);
  }
};

exports.updateTechnicianStatus = async (req, res, next) => {
  try {
    let { status } = req.body;
    if (status === 'approved') status = 'active';
    const allowed = ['pending', 'active', 'inactive', 'rejected'];
    if (!allowed.includes(status)) throw createError('Invalid status', 400);

    const result = await query(
      `UPDATE users SET status = $1 WHERE id = $2 AND role = 'technician' RETURNING id, full_name, status`,
      [status, req.params.id]
    );
    if (!result.rows[0]) throw createError('Technician not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteTechnician = async (req, res, next) => {
  try {
    const result = await query(
      "DELETE FROM users WHERE id = $1 AND role = 'technician' RETURNING full_name",
      [req.params.id]
    );
    if (!result.rows[0]) throw createError('Technician not found', 404);
    await logAudit({
      actorId: req.user.id,
      actorName: req.user.full_name,
      actorRole: req.user.role,
      action: 'delete',
      targetType: 'user',
      targetId: req.params.id,
      targetDescription: result.rows[0].full_name
    });
    res.json({ success: true, message: 'Technician deleted successfully' });
  } catch (error) {
    next(error);
  }
};
