const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { emitToAdmins } = require('../services/socketService');

exports.getTechnicians = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["u.role = 'technician'"]; const params = []; let idx = 1;
    if (status) {
      if (status === 'active') { conditions.push(`tech.approval_status = 'approved'`); }
      else if (status === 'pending') { conditions.push(`tech.approval_status = 'pending'`); }
      else { conditions.push(`tech.approval_status = $${idx++}`); params.push(status); }
    }
    if (search) { conditions.push(`(u.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR tech.employee_id ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const dataParams = [...params, parseInt(limit), offset];
    const [data, count] = await Promise.all([
      query(`SELECT u.id, tech.employee_id, u.full_name, u.email, u.contact_number, tech.approval_status as status, u.profile_image_url, u.specialization, u.department, u.last_login_at, u.created_at,
             COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) AS active_tickets,
             COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed')) AS completed_tickets,
             COUNT(t.id) AS total_tickets
             FROM users u 
             INNER JOIN technicians tech ON u.id = tech.user_id 
             LEFT JOIN tickets t ON u.id = t.assigned_technician_id
             ${where} GROUP BY u.id, tech.employee_id, tech.approval_status ORDER BY u.${sortBy} ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
             LIMIT $${idx++} OFFSET $${idx}`, dataParams),
      query(`SELECT COUNT(*) FROM users u INNER JOIN technicians tech ON u.id = tech.user_id ${where}`, params)
    ]);
    res.json({ success: true, data: data.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count.rows[0].count), totalPages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)) } });
  } catch (error) { next(error); }
};

exports.getPendingTechnicians = async (req, res, next) => {
  try {
    const result = await query(`SELECT u.id, tech.employee_id, u.full_name, u.email, u.contact_number, u.address, u.specialization, u.department, u.created_at 
      FROM users u 
      INNER JOIN technicians tech ON u.id = tech.user_id 
      WHERE u.role = 'technician' AND tech.approval_status = 'pending' 
      ORDER BY u.created_at ASC`);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

exports.getTechnicianById = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.id, tech.employee_id, u.full_name, u.email, u.contact_number, u.address, u.profile_image_url, u.specialization, u.department, tech.approval_status as status, u.last_login_at, u.created_at,
             COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) AS active_tickets,
             COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed')) AS completed_tickets,
             ROUND(AVG(f.rating)::numeric, 2) AS avg_satisfaction
      FROM users u 
      INNER JOIN technicians tech ON u.id = tech.user_id 
      LEFT JOIN tickets t ON u.id = t.assigned_technician_id 
      LEFT JOIN feedback f ON t.id = f.ticket_id
      WHERE u.id = $1 AND u.role = 'technician' 
      GROUP BY u.id, tech.employee_id, tech.approval_status`, [req.params.id]);
    if (!result.rows[0]) throw createError('Technician not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.approveTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(`
      WITH updated_tech AS (
        UPDATE technicians SET approval_status = 'approved', approval_date = NOW(), approved_by = $2 WHERE user_id = $1 AND approval_status = 'pending' RETURNING user_id, employee_id
      )
      SELECT u.id, u.full_name, u.email, ut.employee_id
      FROM updated_tech ut
      JOIN users u ON u.id = ut.user_id
    `, [id, req.user.id]);
    if (!result.rows[0]) throw createError('Technician not found or already processed', 404);
    const tech = result.rows[0];
    await createNotification({ userId: id, type: 'technician_approved', title: 'Account Approved', body: 'Your technician account has been approved. You can now log in.', data: {} });
    await logAudit({ actorId: req.user.id, actorName: req.user.full_name, actorRole: req.user.role, action: 'approve', targetType: 'user', targetId: id, targetDescription: tech.full_name });
    emitToAdmins('technician:approved', { technicianId: id, fullName: tech.full_name });
    res.json({ success: true, data: tech, message: `${tech.full_name} has been approved` });
  } catch (error) { next(error); }
};

exports.rejectTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await query(`
      WITH updated_tech AS (
        UPDATE technicians SET approval_status = 'rejected', rejection_reason = $2 WHERE user_id = $1 RETURNING user_id
      )
      SELECT u.id, u.full_name, u.email
      FROM updated_tech ut
      JOIN users u ON u.id = ut.user_id
    `, [id, reason]);
    if (!result.rows[0]) throw createError('Technician not found', 404);
    const tech = result.rows[0];
    await createNotification({ userId: id, type: 'technician_rejected', title: 'Account Not Approved', body: reason || 'Your account application was not approved. Please contact the administrator.', data: { reason } });
    await logAudit({ actorId: req.user.id, actorName: req.user.full_name, actorRole: req.user.role, action: 'reject', targetType: 'user', targetId: id, targetDescription: tech.full_name });
    res.json({ success: true, message: `${tech.full_name}'s application has been rejected` });
  } catch (error) { next(error); }
};

exports.updateTechnicianStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending','approved','rejected'].includes(status)) throw createError('Invalid status', 400);
    const result = await query(`
      WITH updated_tech AS (
        UPDATE technicians SET approval_status = $1 WHERE user_id = $2 RETURNING user_id, approval_status as status
      )
      SELECT u.id, u.full_name, ut.status
      FROM updated_tech ut
      JOIN users u ON u.id = ut.user_id
    `, [status, req.params.id]);
    if (!result.rows[0]) throw createError('Technician not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.deleteTechnician = async (req, res, next) => {
  try {
    const result = await query("DELETE FROM users WHERE id = $1 AND role = 'technician' RETURNING full_name", [req.params.id]);
    if (!result.rows[0]) throw createError('Technician not found', 404);
    await logAudit({ actorId: req.user.id, actorName: req.user.full_name, actorRole: req.user.role, action: 'delete', targetType: 'user', targetId: req.params.id, targetDescription: result.rows[0].full_name });
    res.json({ success: true, message: 'Technician deleted successfully' });
  } catch (error) { next(error); }
};

