const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');

router.get('/admin', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [ticketStats, recentTickets, pendingTechs, recentActivity, categoryStats, weeklyTrend] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'open') AS open_tickets,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tickets,
          COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_tickets,
          COUNT(*) FILTER (WHERE status = 'closed') AS closed_tickets,
          COUNT(*) FILTER (WHERE priority::text = 'critical') AS critical_tickets,
          COUNT(*) FILTER (WHERE priority::text = 'high') AS high_tickets,
          COUNT(*) FILTER (WHERE priority::text = 'medium') AS medium_tickets,
          COUNT(*) FILTER (WHERE priority::text = 'low') AS low_tickets,
          COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('resolved','closed')) AS sla_breached,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS this_week,
          COUNT(*) AS total
        FROM tickets
      `),
      query(`
        SELECT t.id, t.ticket_number, t.subject AS title, t.status, t.priority, t.created_at, t.sla_deadline AS sla_due_at, c.full_name AS customer_name, cat.name AS category_name, cat.color_code AS category_color, cat.icon AS category_icon, u.full_name AS assignee_name 
        FROM tickets t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        LEFT JOIN service_categories cat ON t.service_category_id = cat.id 
        LEFT JOIN users u ON t.assigned_technician_id = u.id 
        ORDER BY t.created_at DESC 
        LIMIT 10
      `),
      query(`SELECT COUNT(*) AS count FROM users WHERE role = 'technician' AND status = 'pending'`),
      query(`
        SELECT al.action, u.full_name AS actor_name, al.entity_type AS target_type, al.created_at, al.entity_id AS target_description
        FROM audit_logs al 
        LEFT JOIN users u ON al.performed_by = u.id 
        ORDER BY al.created_at DESC 
        LIMIT 15
      `),
      query(`
        SELECT cat.name, cat.color_code AS color, COUNT(t.id) AS total 
        FROM service_categories cat 
        LEFT JOIN tickets t ON cat.id = t.service_category_id 
        GROUP BY cat.id, cat.name, cat.color_code 
        ORDER BY total DESC
      `),
      query(`
        SELECT 
          TO_CHAR(d.day, 'Dy') AS day,
          COUNT(t.id) AS created_count,
          COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')) AS resolved_count
        FROM generate_series(NOW() - INTERVAL '6 days', NOW(), '1 day'::interval) d(day)
        LEFT JOIN tickets t ON DATE_TRUNC('day', t.created_at) = DATE_TRUNC('day', d.day)
        GROUP BY d.day
        ORDER BY d.day ASC
      `)
    ]);

    res.json({
      success: true,
      data: {
        ticketStats: ticketStats.rows[0],
        recentTickets: recentTickets.rows,
        pendingTechnicians: parseInt(pendingTechs.rows[0].count),
        recentActivity: recentActivity.rows,
        categoryStats: categoryStats.rows,
        weeklyTrend: weeklyTrend.rows
      }
    });
  } catch (error) { next(error); }
});

router.get('/technician', authenticate, authorize('technician'), async (req, res, next) => {
  try {
    const techId = req.user.id;
    const [stats, recentTickets, completedToday] = await Promise.all([
      query(`SELECT COUNT(*) FILTER (WHERE status = 'open') AS open_tickets, COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tickets, COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_tickets, COUNT(*) FILTER (WHERE priority IN ('high','critical')) AS urgent_tickets, COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('resolved','closed')) AS sla_breached FROM tickets WHERE assigned_technician_id = $1`, [techId]),
      query(`SELECT t.id, t.ticket_number, t.subject AS title, t.status, t.priority, t.sla_deadline AS sla_due_at, t.created_at, c.full_name AS customer_name, c.complete_address AS customer_address, cat.name AS category_name, cat.icon AS category_icon, cat.color_code AS category_color FROM tickets t LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN service_categories cat ON t.service_category_id = cat.id WHERE t.assigned_technician_id = $1 AND t.status NOT IN ('closed') ORDER BY CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.sla_deadline ASC NULLS LAST LIMIT 10`, [techId]),
      query(`SELECT COUNT(*) AS count FROM tickets WHERE assigned_technician_id = $1 AND resolved_at >= NOW() - INTERVAL '24 hours'`, [techId])
    ]);
    res.json({ success: true, data: { stats: stats.rows[0], recentTickets: recentTickets.rows, completedToday: parseInt(completedToday.rows[0].count) } });
  } catch (error) { next(error); }
});

module.exports = router;
