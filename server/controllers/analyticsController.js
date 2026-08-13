const { query } = require('../config/database');

exports.getOverview = async (req, res, next) => {
  try {
    const { period = '30', startDate, endDate } = req.query;
    const dateFilter = startDate && endDate
      ? `AND created_at BETWEEN '${startDate}' AND '${endDate}'`
      : `AND created_at >= NOW() - INTERVAL '${parseInt(period)} days'`;

    const [tickets, customers, technicians, satisfaction] = await Promise.all([
      query(`SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'open') AS open,
             COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
             COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
             COUNT(*) FILTER (WHERE status = 'closed') AS closed,
             ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL)::numeric, 2) AS avg_resolution_hours,
             COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('resolved','closed')) AS sla_breached,
             COUNT(*) FILTER (WHERE sla_deadline >= NOW() AND sla_deadline <= NOW() + INTERVAL '4 hours' AND status NOT IN ('resolved','closed')) AS sla_at_risk,
             COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND (status IN ('resolved','closed') AND COALESCE(resolved_at, NOW()) <= sla_deadline OR status NOT IN ('resolved','closed') AND NOW() <= sla_deadline)) AS sla_within
             FROM tickets WHERE 1=1 ${dateFilter}`),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${parseInt(period)} days') AS period_new FROM customers`),
      query(`SELECT COUNT(*) FILTER (WHERE u.status = 'active') AS active, COUNT(*) FILTER (WHERE u.status = 'pending') AS pending FROM users u WHERE u.role = 'technician'`),
      query(`SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*) AS total_feedback FROM feedback`).catch(() => ({ rows: [{ avg_rating: null, total_feedback: 0 }] }))
    ]);
    res.json({ success: true, data: { tickets: tickets.rows[0], customers: customers.rows[0], technicians: technicians.rows[0], satisfaction: satisfaction.rows[0] } });
  } catch (error) { next(error); }
};

exports.getTicketsTrend = async (req, res, next) => {
  try {
    const { period = '30', startDate, endDate } = req.query;
    const dateFilter = startDate && endDate
      ? `created_at BETWEEN '${startDate}' AND '${endDate}'`
      : `created_at >= NOW() - INTERVAL '${parseInt(period)} days'`;
    const result = await query(`
      SELECT DATE_TRUNC('day', created_at) AS date,
             COUNT(*) AS created,
             COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS resolved
      FROM tickets WHERE ${dateFilter}
      GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC`);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

exports.getCategoryBreakdown = async (req, res, next) => {
  try {
    const { startDate, endDate, period = '30' } = req.query;
    const dateFilter = startDate && endDate
      ? `AND t.created_at BETWEEN '${startDate}' AND '${endDate}'`
      : `AND t.created_at >= NOW() - INTERVAL '${parseInt(period)} days'`;
    const result = await query(`
      SELECT cat.name, cat.color_code AS color, cat.icon,
             COUNT(t.id) AS total,
             COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed')) AS resolved,
             ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600) FILTER (WHERE t.resolved_at IS NOT NULL)::numeric, 2) AS avg_resolution_hours
      FROM service_categories cat LEFT JOIN tickets t ON cat.id = t.service_category_id AND 1=1 ${dateFilter}
      GROUP BY cat.id ORDER BY total DESC`);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

exports.getTechnicianPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate, period = '30' } = req.query;
    const dateFilter = startDate && endDate
      ? `AND t.created_at BETWEEN '${startDate}' AND '${endDate}'`
      : `AND t.created_at >= NOW() - INTERVAL '${parseInt(period)} days'`;
    const result = await query(`
      SELECT u.id, u.full_name, u.employee_id,
             COUNT(t.id) AS total_assigned,
             COUNT(t.id) FILTER (WHERE t.status IN ('resolved','closed')) AS completed,
             COUNT(t.id) FILTER (WHERE t.status NOT IN ('resolved','closed')) AS active,
             ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600) FILTER (WHERE t.resolved_at IS NOT NULL)::numeric, 2) AS avg_resolution_hours,
             ROUND(AVG(f.rating)::numeric, 2) AS avg_satisfaction
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_technician_id AND 1=1 ${dateFilter}
      LEFT JOIN feedback f ON t.id = f.ticket_id
      WHERE u.role = 'technician' AND u.status = 'active'
      GROUP BY u.id ORDER BY completed DESC LIMIT 15`);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

exports.getResponseTimes = async (req, res, next) => {
  try {
    const { startDate, endDate, period = '30' } = req.query;
    const dateFilter = startDate && endDate
      ? `created_at BETWEEN '${startDate}' AND '${endDate}'`
      : `created_at >= NOW() - INTERVAL '${parseInt(period)} days'`;
    const result = await query(`
      SELECT priority,
             ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL)::numeric, 2) AS avg_resolution_hours,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE sla_deadline < COALESCE(resolved_at, NOW())) AS sla_breached
      FROM tickets WHERE ${dateFilter} GROUP BY priority
      ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
};

exports.getSlaPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate, period = '30' } = req.query;
    const dateFilter = startDate && endDate
      ? `created_at BETWEEN '${startDate}' AND '${endDate}'`
      : `created_at >= NOW() - INTERVAL '${parseInt(period)} days'`;
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND (
          (status IN ('resolved','closed') AND COALESCE(resolved_at, NOW()) <= sla_deadline) OR
          (status NOT IN ('resolved','closed') AND NOW() <= sla_deadline)
        )) AS within_sla,
        COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND sla_deadline >= NOW() AND sla_deadline <= NOW() + INTERVAL '4 hours' AND status NOT IN ('resolved','closed')) AS at_risk,
        COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND sla_deadline < COALESCE(resolved_at, NOW()) AND (status IN ('resolved','closed') OR NOW() > sla_deadline)) AS breached,
        COUNT(*) FILTER (WHERE sla_deadline IS NULL) AS no_sla
      FROM tickets WHERE ${dateFilter}`);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
};

exports.getSatisfactionScores = async (req, res, next) => {
  try {
    const [overall, byCategory, trend] = await Promise.all([
      query(`SELECT ROUND(AVG(rating)::numeric, 2) AS avg, COUNT(*) AS total, COUNT(*) FILTER (WHERE rating = 5) AS five_star, COUNT(*) FILTER (WHERE rating >= 4) AS positive FROM feedback`).catch(() => ({ rows: [{}] })),
      query(`SELECT cat.name, cat.color_code AS color, ROUND(AVG(f.rating)::numeric, 2) AS avg_rating, COUNT(f.id) AS total FROM feedback f JOIN tickets t ON f.ticket_id = t.id JOIN service_categories cat ON t.service_category_id = cat.id GROUP BY cat.id ORDER BY avg_rating DESC`).catch(() => ({ rows: [] })),
      query(`SELECT DATE_TRUNC('week', submitted_at) AS week, ROUND(AVG(rating)::numeric, 2) AS avg_rating FROM feedback WHERE submitted_at >= NOW() - INTERVAL '90 days' GROUP BY DATE_TRUNC('week', submitted_at) ORDER BY week ASC`).catch(() => ({ rows: [] }))
    ]);
    res.json({ success: true, data: { overall: overall.rows[0], byCategory: byCategory.rows, trend: trend.rows } });
  } catch (error) { next(error); }
};
