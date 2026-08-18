const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');

router.get('/admin', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [
      ticketStats,
      recentTickets,
      pendingTechs,
      recentActivity,
      categoryStats,
      weeklyTrend,
      technicianWorkload,
      slaPerformance,
      todayActivity
    ] = await Promise.all([
      // 1. Core Ticket Statistics
      query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'open') AS open_tickets,
          COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tickets,
          COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_tickets,
          COUNT(*) FILTER (WHERE status = 'closed') AS closed_tickets,
          COUNT(*) FILTER (WHERE assigned_technician_id IS NULL AND status NOT IN ('resolved','closed')) AS unassigned_tickets,
          COUNT(*) FILTER (WHERE sla_deadline >= NOW() AND sla_deadline <= NOW() + INTERVAL '4 hours' AND status NOT IN ('resolved','closed')) AS sla_at_risk,
          COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('resolved','closed')) AS overdue_tickets,
          COUNT(*) FILTER (WHERE priority::text = 'critical') AS critical_tickets,
          COUNT(*) FILTER (WHERE priority::text = 'high') AS high_tickets,
          COUNT(*) FILTER (WHERE priority::text = 'medium') AS medium_tickets,
          COUNT(*) FILTER (WHERE priority::text = 'low') AS low_tickets,
          COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('resolved','closed')) AS sla_breached,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS this_week,
          COUNT(*) AS total
        FROM tickets
      `),
      // 2. Recent & Priority Tickets
      query(`
        SELECT t.id, t.ticket_number, t.subject AS title, t.status, t.priority, t.created_at, t.sla_deadline AS sla_due_at,
               c.full_name AS customer_name, cat.name AS category_name, cat.color_code AS category_color, cat.icon AS category_icon,
               u.full_name AS assignee_name 
        FROM tickets t 
        LEFT JOIN customers c ON t.customer_id = c.id 
        LEFT JOIN service_categories cat ON t.service_category_id = cat.id 
        LEFT JOIN users u ON t.assigned_technician_id = u.id 
        ORDER BY t.created_at DESC 
        LIMIT 10
      `),
      // 3. Pending Technician Approvals Count
      query(`SELECT COUNT(*) AS count FROM users WHERE role = 'technician' AND status = 'pending'`),
      // 4. Audit Log Activity Stream
      query(`
        SELECT al.action, u.full_name AS actor_name, al.entity_type AS target_type, al.created_at, al.entity_id AS target_description
        FROM audit_logs al 
        LEFT JOIN users u ON al.performed_by = u.id 
        ORDER BY al.created_at DESC 
        LIMIT 15
      `),
      // 5. Category Breakdown
      query(`
        SELECT cat.name, cat.color_code AS color, COUNT(t.id) AS total 
        FROM service_categories cat 
        LEFT JOIN tickets t ON cat.id = t.service_category_id 
        GROUP BY cat.id, cat.name, cat.color_code 
        ORDER BY total DESC
      `),
      // 6. 7-Day Weekly Ticket Activity Trend (Monday - Sunday)
      query(`
        SELECT 
          TO_CHAR(d.day, 'Dy') AS day,
          TO_CHAR(d.day, 'YYYY-MM-DD') AS date_str,
          COUNT(t.id) AS created_count,
          COUNT(t.id) FILTER (WHERE t.status IN ('resolved', 'closed')) AS resolved_count
        FROM generate_series(NOW() - INTERVAL '6 days', NOW(), '1 day'::interval) d(day)
        LEFT JOIN tickets t ON DATE_TRUNC('day', t.created_at) = DATE_TRUNC('day', d.day)
        GROUP BY d.day
        ORDER BY d.day ASC
      `),
      // 7. Technician Workload Breakdown
      query(`
        SELECT u.id, u.full_name AS name, u.employee_id, COUNT(t.id) AS active_tickets
        FROM users u
        LEFT JOIN tickets t ON u.id = t.assigned_technician_id AND t.status NOT IN ('resolved','closed')
        WHERE u.role = 'technician' AND u.status = 'active'
        GROUP BY u.id, u.full_name, u.employee_id
        ORDER BY active_tickets DESC
        LIMIT 8
      `),
      // 8. SLA Performance Breakdown
      query(`
        SELECT
          COUNT(*) FILTER (WHERE (sla_deadline IS NULL OR sla_deadline > NOW() + INTERVAL '4 hours') AND status NOT IN ('resolved','closed')) AS within_sla,
          COUNT(*) FILTER (WHERE sla_deadline >= NOW() AND sla_deadline <= NOW() + INTERVAL '4 hours' AND status NOT IN ('resolved','closed')) AS at_risk,
          COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('resolved','closed')) AS breached
        FROM tickets
      `),
      // 9. Today's Activity Summary Metrics
      query(`
        SELECT
          (SELECT COUNT(*) FROM tickets WHERE created_at >= CURRENT_DATE) AS new_tickets_today,
          (SELECT COUNT(*) FROM tickets WHERE resolved_at >= CURRENT_DATE) AS resolved_today,
          (SELECT COUNT(*) FROM tickets WHERE assigned_technician_id IS NOT NULL AND updated_at >= CURRENT_DATE) AS assigned_today,
          (SELECT COUNT(*) FROM ticket_updates WHERE created_at >= CURRENT_DATE) AS status_changes_today,
          (SELECT COUNT(*) FROM customers WHERE created_at >= CURRENT_DATE) AS new_customers_today
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
        weeklyTrend: weeklyTrend.rows,
        technicianWorkload: technicianWorkload.rows,
        slaPerformance: slaPerformance.rows[0],
        todayActivity: todayActivity.rows[0]
      }
    });
  } catch (error) { next(error); }
});

router.get('/technician', authenticate, authorize('technician'), async (req, res, next) => {
  try {
    const techId = req.user.id;
    const [
      statsRes,
      completedTodayRes,
      requiresAttentionRes,
      assignedQueueRes,
      weeklyActivityRes,
      recentActivityRes
    ] = await Promise.all([
      // 1. Core KPIs & Workload counts
      query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'open') AS open_tickets,
           COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tickets,
           COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS completed_tickets,
           COUNT(*) FILTER (WHERE priority IN ('high','critical') AND status NOT IN ('resolved','closed')) AS urgent_tickets,
           COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('resolved','closed')) AS sla_breached,
           COUNT(*) AS total_assigned
         FROM tickets WHERE assigned_technician_id = $1`,
        [techId]
      ),
      // 2. Completed Today
      query(
        `SELECT COUNT(*) AS count FROM tickets 
         WHERE assigned_technician_id = $1 
         AND status IN ('resolved','closed')
         AND (resolved_at >= CURRENT_DATE OR updated_at >= CURRENT_DATE)`,
        [techId]
      ),
      // 3. Requires Attention (High/Critical OR SLA Breached/Approaching <= 4h)
      query(
        `SELECT t.id, t.ticket_number, t.subject AS title, t.description, t.status, t.priority, t.sla_deadline, t.created_at,
                c.full_name AS customer_name, c.complete_address AS customer_address, c.contact_number AS customer_contact,
                cat.name AS category_name, cat.color_code AS category_color
         FROM tickets t
         LEFT JOIN customers c ON t.customer_id = c.id
         LEFT JOIN service_categories cat ON t.service_category_id = cat.id
         WHERE t.assigned_technician_id = $1 
           AND t.status NOT IN ('resolved','closed')
           AND (t.priority IN ('high','critical') OR t.sla_deadline < NOW() + INTERVAL '4 hours')
         ORDER BY CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, t.sla_deadline ASC NULLS LAST
         LIMIT 6`,
        [techId]
      ),
      // 4. Full Assigned Queue (Priority order)
      query(
        `SELECT t.id, t.ticket_number, t.subject AS title, t.description, t.status, t.priority, t.sla_deadline, t.created_at,
                c.full_name AS customer_name, c.complete_address AS customer_address, c.contact_number AS customer_contact,
                cat.name AS category_name, cat.color_code AS category_color
         FROM tickets t
         LEFT JOIN customers c ON t.customer_id = c.id
         LEFT JOIN service_categories cat ON t.service_category_id = cat.id
         WHERE t.assigned_technician_id = $1
         ORDER BY CASE t.status WHEN 'in_progress' THEN 1 WHEN 'open' THEN 2 ELSE 3 END,
                  CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
                  t.sla_deadline ASC NULLS LAST
         LIMIT 12`,
        [techId]
      ),
      // 5. Weekly Activity (Monday - Sunday for current week)
      query(
        `SELECT EXTRACT(ISODOW FROM COALESCE(t.resolved_at, t.updated_at)) AS day_num,
                TO_CHAR(COALESCE(t.resolved_at, t.updated_at), 'Dy') AS day_name,
                COUNT(*) AS completed
         FROM tickets t
         WHERE t.assigned_technician_id = $1
           AND t.status IN ('resolved','closed')
           AND COALESCE(t.resolved_at, t.updated_at) >= DATE_TRUNC('week', CURRENT_DATE)
         GROUP BY day_num, day_name
         ORDER BY day_num ASC`,
        [techId]
      ),
      // 6. Recent Activity Log for this technician
      query(
        `SELECT tu.id, tu.ticket_id, tu.status_changed_to, tu.notes, tu.created_at,
                t.ticket_number, t.subject AS title, u.full_name AS updated_by_name
         FROM ticket_updates tu
         JOIN tickets t ON tu.ticket_id = t.id
         LEFT JOIN users u ON tu.updated_by = u.id
         WHERE t.assigned_technician_id = $1 OR tu.updated_by = $1
         ORDER BY tu.created_at DESC
         LIMIT 8`,
        [techId]
      )
    ]);

    const stats = statsRes.rows[0] || {};
    const completedTodayCount = parseInt(completedTodayRes.rows[0]?.count || 0);

    // Map weekly activity to all 7 days Mon-Sun
    const daysMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };
    const weeklyDataMap = {};
    weeklyActivityRes.rows.forEach(r => {
      weeklyDataMap[parseInt(r.day_num)] = parseInt(r.completed);
    });
    const weeklyActivity = [1, 2, 3, 4, 5, 6, 7].map(dayNum => ({
      day: daysMap[dayNum],
      completed: weeklyDataMap[dayNum] || 0
    }));

    res.json({
      success: true,
      data: {
        stats: {
          open_tickets: parseInt(stats.open_tickets || 0),
          in_progress_tickets: parseInt(stats.in_progress_tickets || 0),
          completed_tickets: parseInt(stats.completed_tickets || 0),
          urgent_tickets: parseInt(stats.urgent_tickets || 0),
          sla_breached: parseInt(stats.sla_breached || 0),
          total_assigned: parseInt(stats.total_assigned || 0)
        },
        completedToday: completedTodayCount,
        requiresAttention: requiresAttentionRes.rows,
        assignedQueue: assignedQueueRes.rows,
        weeklyActivity,
        recentActivity: recentActivityRes.rows
      }
    });
  } catch (error) { next(error); }
});

module.exports = router;
