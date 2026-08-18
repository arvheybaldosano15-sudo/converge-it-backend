const { query, getClient } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const { logAudit } = require('../services/auditService');
const { emitToUser, emitToAdmins, emitToRoom } = require('../services/socketService');
const { createNotification } = require('../services/notificationService');

exports.getTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, priority, category, assignedTo, slaStatus, search, sortBy = 'created_at', sortOrder = 'DESC', startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = []; const params = []; let idx = 1;
    if (req.user.role === 'technician') { conditions.push(`t.assigned_technician_id = $${idx++}`); params.push(req.user.id); }
    if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`t.priority = $${idx++}`); params.push(priority); }
    if (category) { conditions.push(`t.service_category_id = $${idx++}`); params.push(category); }
    if (assignedTo === 'unassigned') { conditions.push(`t.assigned_technician_id IS NULL`); }
    else if (assignedTo) { conditions.push(`t.assigned_technician_id = $${idx++}`); params.push(assignedTo); }
    
    if (slaStatus === 'breached') {
      conditions.push(`(t.sla_deadline < NOW() AND t.status NOT IN ('resolved','closed'))`);
    } else if (slaStatus === 'at_risk') {
      conditions.push(`(t.sla_deadline >= NOW() AND t.sla_deadline <= NOW() + INTERVAL '4 hours' AND t.status NOT IN ('resolved','closed'))`);
    } else if (slaStatus === 'within') {
      conditions.push(`((t.sla_deadline IS NULL OR t.sla_deadline > NOW() + INTERVAL '4 hours') AND t.status NOT IN ('resolved','closed'))`);
    }

    if (startDate) { conditions.push(`t.created_at >= $${idx++}`); params.push(startDate); }
    if (endDate) { conditions.push(`t.created_at <= $${idx++}`); params.push(endDate); }
    if (search) { conditions.push(`(t.ticket_number ILIKE $${idx} OR t.subject ILIKE $${idx} OR c.full_name ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const validSort = ['created_at','updated_at','priority','status','ticket_number','sla_deadline'];
    const col = validSort.includes(sortBy) ? sortBy : 'created_at';
    const ord = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const dataParams = [...params, parseInt(limit), offset];
    const [data, count] = await Promise.all([
      query(`SELECT t.id, t.ticket_number, t.subject, t.status, t.priority, t.ai_priority_recommendation, t.ai_estimated_resolution_hours,
             t.created_at, t.updated_at, t.sla_deadline, t.resolved_at, t.assigned_technician_id AS assigned_to,
             c.full_name AS customer_name, c.contact_number AS customer_contact, c.messenger_psid,
             cat.name AS category_name, cat.icon AS category_icon, cat.color_code AS category_color,
             u.full_name AS assignee_name, u.profile_image_url AS assignee_avatar, u.employee_id AS assignee_employee_id
             FROM tickets t
             LEFT JOIN customers c ON t.customer_id = c.id
             LEFT JOIN service_categories cat ON t.service_category_id = cat.id
             LEFT JOIN users u ON t.assigned_technician_id = u.id
             ${where} ORDER BY t.${col} ${ord} LIMIT $${idx++} OFFSET $${idx}`, dataParams),
      query(`SELECT COUNT(*) FROM tickets t LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN service_categories cat ON t.service_category_id = cat.id ${where}`, params)
    ]);
    res.json({ success: true, data: data.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(count.rows[0].count), totalPages: Math.ceil(parseInt(count.rows[0].count) / parseInt(limit)) } });
  } catch (error) { next(error); }
};

exports.getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticketRes = await query(`
      SELECT t.*, c.full_name AS customer_name, c.contact_number AS customer_contact,
             c.complete_address AS customer_address, c.messenger_psid, cat.name AS category_name, cat.icon AS category_icon,
             u.full_name AS assignee_name, u.profile_image_url AS assignee_avatar, u.contact_number AS assignee_contact, u.employee_id AS assignee_employee_id
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN service_categories cat ON t.service_category_id = cat.id
      LEFT JOIN users u ON t.assigned_technician_id = u.id
      WHERE t.id = $1`, [id]);
    if (!ticketRes.rows[0]) throw createError('Ticket not found', 404);
    const ticket = ticketRes.rows[0];
    if (req.user.role === 'technician' && ticket.assigned_technician_id !== req.user.id) throw createError('Access denied', 403);
    const [updates, serviceReport] = await Promise.all([
      query(`SELECT tu.*, u.full_name AS user_name, u.role AS user_role, u.profile_image_url AS user_avatar
             FROM ticket_updates tu LEFT JOIN users u ON tu.updated_by = u.id WHERE tu.ticket_id = $1 ORDER BY tu.created_at ASC`, [id]),
      query(`SELECT sr.*, u.full_name AS technician_name, u.employee_id AS technician_employee_id
             FROM service_reports sr
             LEFT JOIN users u ON sr.technician_id = u.id
             WHERE sr.ticket_id = $1`, [id])
    ]);
    res.json({
      success: true,
      data: {
        ...ticket,
        updates: updates.rows,
        serviceReport: serviceReport.rows[0] || null
      }
    });
  } catch (error) { next(error); }
};

exports.createTicket = async (req, res, next) => {
  try {
    const { customerId, categoryId, assignedTo, priority, subject, description, aiPriority, aiEtaHours } = req.body;
    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
    const priorityVal = (priority || 'medium').toLowerCase();
    const result = await query(
      `INSERT INTO tickets (ticket_number, customer_id, service_category_id, assigned_technician_id, priority, status, subject, description, ai_priority_recommendation, ai_estimated_resolution_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [ticketNumber, customerId, categoryId || null, assignedTo || null, priorityVal, 'open', subject, description, (aiPriority || priorityVal), aiEtaHours || 24]
    );
    const ticket = result.rows[0];
    await logAudit({ actorId: req.user.id, actorName: req.user.full_name, actorRole: req.user.role, action: 'create', targetType: 'ticket', targetId: ticket.id, targetDescription: ticket.ticket_number });
    if (assignedTo) {
      await createNotification({ userId: assignedTo, type: 'ticket_assigned', title: 'New Ticket Assigned', body: `Ticket ${ticket.ticket_number} has been assigned to you`, data: { ticketId: ticket.id, ticketNumber: ticket.ticket_number } });
    }
    emitToAdmins('ticket:created', { ticket });
    res.status(201).json({ success: true, data: ticket, message: 'Ticket created successfully' });
  } catch (error) { next(error); }
};

exports.updateTicket = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { status, priority, assignedTo, categoryId, subject, description, note } = req.body;
    const oldRes = await client.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (!oldRes.rows[0]) throw createError('Ticket not found', 404);
    const old = oldRes.rows[0];
    if (req.user.role === 'technician') {
      if (old.assigned_technician_id !== req.user.id) throw createError('Access denied', 403);
      if (old.status === 'closed') throw createError('This ticket has been closed by an administrator and cannot be modified', 403);
      if (old.status === 'in_progress' && status === 'open') {
        throw createError('Tickets in progress cannot revert to pending', 400);
      }
      if (old.status === 'resolved' && ['open', 'in_progress'].includes(status)) {
        throw createError('Resolved tickets cannot revert to pending or in progress', 400);
      }
    }
    const updates = []; const values = []; let i = 1;
    if (status) { updates.push(`status = $${i++}`); values.push(status); }
    if (priority && req.user.role === 'admin') { updates.push(`priority = $${i++}`); values.push(priority); }
    if (assignedTo !== undefined && req.user.role === 'admin') { updates.push(`assigned_technician_id = $${i++}`); values.push(assignedTo || null); }
    if (categoryId && req.user.role === 'admin') { updates.push(`service_category_id = $${i++}`); values.push(categoryId); }
    if (subject && req.user.role === 'admin') { updates.push(`subject = $${i++}`); values.push(subject); }
    if (description && req.user.role === 'admin') { updates.push(`description = $${i++}`); values.push(description); }
    let updatedTicket = old;
    if (updates.length > 0) {
      values.push(id);
      const upRes = await client.query(`UPDATE tickets SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
      updatedTicket = upRes.rows[0];
    }
    await client.query(
      `INSERT INTO ticket_updates (ticket_id, updated_by, status_changed_to, notes)
       VALUES ($1, $2, $3, $4)`,
      [id, req.user.id, status || old.status, note || null]
    );
    await client.query('COMMIT');
    if (assignedTo && assignedTo !== old.assigned_technician_id) {
      await createNotification({ userId: assignedTo, type: 'ticket_assigned', title: 'Ticket Assigned', body: `Ticket ${updatedTicket.ticket_number} assigned to you`, data: { ticketId: id } });
    }
    emitToRoom(`ticket:${id}`, 'ticket:updated', { ticket: updatedTicket });
    emitToAdmins('ticket:updated', { ticket: updatedTicket });
    await logAudit({ actorId: req.user.id, actorName: req.user.full_name, actorRole: req.user.role, action: 'update', targetType: 'ticket', targetId: id, targetDescription: updatedTicket.ticket_number, oldValues: { status: old.status, priority: old.priority }, newValues: { status: status || old.status, priority: priority || old.priority } });
    res.json({ success: true, data: updatedTicket, message: 'Ticket updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally { client.release(); }
};

exports.deleteTicket = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM tickets WHERE id = $1 RETURNING ticket_number', [req.params.id]);
    if (!result.rows[0]) throw createError('Ticket not found', 404);
    await logAudit({ actorId: req.user.id, actorName: req.user.full_name, actorRole: req.user.role, action: 'delete', targetType: 'ticket', targetId: req.params.id, targetDescription: result.rows[0].ticket_number });
    res.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (error) { next(error); }
};

exports.getTicketStats = async (req, res, next) => {
  try {
    const isTech = req.user.role === 'technician';
    const result = await query(`
      SELECT COUNT(*) FILTER (WHERE status = 'open') AS open_count,
             COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
             COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
             COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
             COUNT(*) FILTER (WHERE assigned_technician_id IS NULL AND status NOT IN ('resolved','closed')) AS unassigned_count,
             COUNT(*) FILTER (WHERE priority = 'critical') AS critical_count,
             COUNT(*) FILTER (WHERE priority = 'high') AS high_count,
             COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('resolved','closed')) AS sla_breached,
             COUNT(*) FILTER (WHERE sla_deadline >= NOW() AND sla_deadline <= NOW() + INTERVAL '4 hours' AND status NOT IN ('resolved','closed')) AS sla_at_risk,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS created_today,
             COUNT(*) FILTER (WHERE resolved_at >= NOW() - INTERVAL '24 hours') AS resolved_today,
             COUNT(*) AS total
      FROM tickets ${isTech ? 'WHERE assigned_technician_id = $1' : ''}`,
      isTech ? [req.user.id] : []
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};
