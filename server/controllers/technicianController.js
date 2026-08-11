const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { emitToAdmins } = require('../services/socketService');

exports.getTechnicians = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
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

    if (search && search.trim() !== '') {
      conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.employee_id ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const dataParams = [...params, parseInt(limit), offset];

    const validSortColumns = ['created_at', 'full_name', 'email', 'employee_id', 'status'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [data, count] = await Promise.all([
      query(
        `SELECT u.id, u.employee_id, u.full_name, u.email, u.contact_number, u.status, u.profile_image_url, u.specialization, u.department, u.last_login_at, u.created_at,
                (SELECT COUNT(*) FROM tickets t WHERE t.assigned_technician_id = u.id AND t.status NOT IN ('resolved','closed')) AS active_tickets,
                (SELECT COUNT(*) FROM tickets t WHERE t.assigned_technician_id = u.id AND t.status IN ('resolved','closed')) AS completed_tickets,
                (SELECT COUNT(*) FROM tickets t WHERE t.assigned_technician_id = u.id) AS total_tickets
         FROM users u 
         ${where} 
         ORDER BY u.${safeSortBy} ${safeSortOrder}
         LIMIT $${idx++} OFFSET $${idx}`,
        dataParams
      ),
      query(`SELECT COUNT(*) FROM users u ${where}`, params)
    ]);

    res.json({
      success: true,
      data: data.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count.rows[0].count),
        totalPages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
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
    const result = await query(
      `SELECT u.id, u.employee_id, u.full_name, u.email, u.contact_number, u.address, u.profile_image_url, u.specialization, u.department, u.status, u.last_login_at, u.created_at,
              COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) AS active_tickets,
              COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed')) AS completed_tickets,
              ROUND(AVG(f.rating)::numeric, 2) AS avg_satisfaction
       FROM users u 
       LEFT JOIN tickets t ON u.id = t.assigned_technician_id 
       LEFT JOIN feedback f ON t.id = f.ticket_id
       WHERE u.id = $1 AND u.role = 'technician' 
       GROUP BY u.id`,
      [req.params.id]
    );
    if (!result.rows[0]) throw createError('Technician not found', 404);
    res.json({ success: true, data: result.rows[0] });
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
    // 'rejected' is now a valid enum value — no need to remap
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
