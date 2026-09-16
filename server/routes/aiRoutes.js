const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const aiService = require('../services/aiService');

router.get('/recommendations', authenticate, authorize('admin'), aiLimiter, async (req, res, next) => {
  try {
    // 1. Fetch active unresolved tickets
    const ticketsRes = await query(`
      SELECT t.id, t.ticket_number, t.subject, t.priority, t.status, t.created_at, t.sla_deadline,
             t.assigned_technician_id, t.service_category_id, cat.name AS category_name
      FROM tickets t 
      LEFT JOIN service_categories cat ON t.service_category_id = cat.id 
      WHERE t.status NOT IN ('resolved', 'closed', 'cancelled')
      ORDER BY 
        CASE WHEN t.priority = 'critical' THEN 1 WHEN t.priority = 'high' THEN 2 ELSE 3 END ASC,
        t.created_at ASC
    `);

    // 2. Fetch active technicians with workload
    const techsRes = await query(`
      SELECT u.id, u.full_name, u.specialization,
             (SELECT COUNT(*) FROM tickets t2 WHERE t2.assigned_technician_id = u.id AND t2.status NOT IN ('resolved', 'closed', 'cancelled')) AS workload
      FROM users u 
      WHERE u.role = 'technician' AND u.status = 'active'
      ORDER BY workload ASC
    `);

    const activeTickets = ticketsRes.rows;
    const technicians = techsRes.rows;

    // Clear non-applied recommendations for resolved/closed tickets
    await query(`
      DELETE FROM ai_recommendations 
      WHERE is_applied = FALSE 
         OR ticket_id IN (SELECT id FROM tickets WHERE status IN ('resolved', 'closed', 'cancelled'))
    `);

    // Generate AI Recommendations for active tickets
    for (const ticket of activeTickets) {
      const p = String(ticket.priority || 'medium').toLowerCase();

      // Rule 1: Critical Priority Alert
      if (p === 'critical') {
        const existing = await query(`SELECT id FROM ai_recommendations WHERE ticket_id = $1 AND type = 'urgent_critical'`, [ticket.id]);
        if (existing.rows.length === 0) {
          const suggestion = `Immediate Action Required: Critical Ticket ${ticket.ticket_number}`;
          const reasoning = `Ticket ${ticket.ticket_number} (${ticket.subject || 'Urgent Issue'}) is flagged as CRITICAL priority. Immediate technician monitoring and fast-track resolution required.`;
          await query(`
            INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
            VALUES ($1, 'urgent_critical', $2, $3, 98.00)
          `, [ticket.id, suggestion, reasoning]);
        }
      }

      // Rule 2: High Priority Action
      if (p === 'high') {
        const existing = await query(`SELECT id FROM ai_recommendations WHERE ticket_id = $1 AND type = 'urgent_high'`, [ticket.id]);
        if (existing.rows.length === 0) {
          const suggestion = `Prioritize High-Priority Ticket ${ticket.ticket_number}`;
          const reasoning = `Ticket ${ticket.ticket_number} (${ticket.subject || 'High Priority Issue'}) requires high-level dispatch to meet SLA response targets.`;
          await query(`
            INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
            VALUES ($1, 'urgent_high', $2, $3, 90.00)
          `, [ticket.id, suggestion, reasoning]);
        }
      }

      // Rule 3: Smart Assignment for Unassigned Tickets
      const availableTechs = technicians.filter(t => parseInt(t.workload, 10) < 3);
      if (!ticket.assigned_technician_id && availableTechs.length > 0) {
        const existing = await query(`SELECT id FROM ai_recommendations WHERE ticket_id = $1 AND type = 'reassignment'`, [ticket.id]);
        if (existing.rows.length === 0) {
          let selectedTech = availableTechs[0];
          const matchingTech = availableTechs.find(t => 
            t.specialization && 
            ticket.category_name && 
            t.specialization.toLowerCase().includes(ticket.category_name.toLowerCase())
          );
          if (matchingTech) selectedTech = matchingTech;

          const suggestion = `Assign ticket ${ticket.ticket_number} to ${selectedTech.full_name}`;
          const reasoning = `Ticket is currently unassigned. ${selectedTech.full_name} has matching specialization or lowest current workload (${selectedTech.workload} active tickets).`;
          const confidence = matchingTech ? 95.00 : 85.00;

          await query(`
            INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
            VALUES ($1, 'reassignment', $2, $3, $4)
          `, [ticket.id, suggestion, reasoning, confidence]);
        }
      }

      // Rule 4: SLA Escalation for Tickets near or past SLA Deadline
      if (ticket.sla_deadline && new Date(ticket.sla_deadline) <= new Date(Date.now() + 6 * 3600 * 1000)) {
        const existing = await query(`SELECT id FROM ai_recommendations WHERE ticket_id = $1 AND type = 'escalation'`, [ticket.id]);
        if (existing.rows.length === 0) {
          const suggestion = `SLA Escalation Alert for Ticket ${ticket.ticket_number}`;
          const reasoning = `Ticket ${ticket.ticket_number} is approaching or has breached its SLA resolution deadline. High priority follow-up needed.`;
          await query(`
            INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
            VALUES ($1, 'escalation', $2, $3, 95.00)
          `, [ticket.id, suggestion, reasoning]);
        }
      }
    }

    // Return recommendations with complete ticket details (dates, priority, subject)
    const finalRecs = await query(`
      SELECT r.*, 
             t.ticket_number, 
             t.priority AS ticket_priority, 
             t.status AS ticket_status, 
             t.subject AS ticket_subject,
             t.created_at AS ticket_created_at,
             t.sla_deadline AS ticket_sla_deadline
      FROM ai_recommendations r
      JOIN tickets t ON r.ticket_id = t.id
      WHERE r.is_applied = FALSE
        AND t.status NOT IN ('resolved', 'closed', 'cancelled')
      ORDER BY 
        CASE WHEN t.priority = 'critical' THEN 1 WHEN t.priority = 'high' THEN 2 ELSE 3 END ASC,
        r.confidence DESC, 
        t.created_at DESC
    `);

    res.json({ success: true, data: finalRecs.rows });
  } catch (error) { next(error); }
});

const applyRecommendationHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recResult = await query(`SELECT * FROM ai_recommendations WHERE id = $1`, [id]);
    const rec = recResult.rows[0];

    if (!rec) return next({ statusCode: 404, message: 'Recommendation not found' });
    if (rec.is_applied) return res.json({ success: true, message: 'Already applied' });

    const ticketResult = await query(`SELECT * FROM tickets WHERE id = $1`, [rec.ticket_id]);
    const ticket = ticketResult.rows[0];
    if (!ticket) return next({ statusCode: 404, message: 'Ticket associated with recommendation not found' });

    if (rec.type === 'reassignment') {
      // Parse the technician name from the suggestion text
      const match = rec.suggestion.match(/to\s+(.+)$/i);
      if (match && match[1]) {
        const techName = match[1].trim();
        const techResult = await query(`SELECT id FROM users WHERE full_name = $1 AND role = 'technician'`, [techName]);
        if (techResult.rows[0]) {
          const techId = techResult.rows[0].id;
          const activeCheck = await query(
            `SELECT ticket_number FROM tickets 
             WHERE assigned_technician_id = $1 AND status NOT IN ('resolved', 'closed', 'cancelled') AND id != $2`,
            [techId, ticket.id]
          );
          if (activeCheck.rows.length >= 3) {
            return next({ statusCode: 400, message: `This technician currently has ${activeCheck.rows.length} active tickets and cannot receive new assignments (limit: 3 active tickets).` });
          }
          await query(`UPDATE tickets SET assigned_technician_id = $1, status = 'in_progress', updated_at = NOW() WHERE id = $2`, [techId, ticket.id]);
        } else {
          const lowestTechResult = await query(`
            SELECT u.id FROM users u 
            WHERE u.role = 'technician' AND u.status = 'active'
            AND (
              SELECT COUNT(*) FROM tickets t2 
              WHERE t2.assigned_technician_id = u.id AND t2.status NOT IN ('resolved', 'closed', 'cancelled') AND t2.id != $1
            ) < 3
            ORDER BY (
              SELECT COUNT(*) FROM tickets t2 
              WHERE t2.assigned_technician_id = u.id AND t2.status NOT IN ('resolved', 'closed', 'cancelled') AND t2.id != $1
            ) ASC
            LIMIT 1
          `, [ticket.id]);
          if (lowestTechResult.rows[0]) {
            await query(`UPDATE tickets SET assigned_technician_id = $1, status = 'in_progress', updated_at = NOW() WHERE id = $2`, [lowestTechResult.rows[0].id, ticket.id]);
          } else {
            return next({ statusCode: 400, message: 'All technicians currently have 3 active tickets and cannot receive new assignments.' });
          }
        }
      }
    } else if (rec.type === 'priority_change') {
      const match = rec.suggestion.match(/to\s+(medium|high|critical)$/i);
      if (match && match[1]) {
        const newPriority = match[1].toLowerCase();
        await query(`UPDATE tickets SET priority = $1, updated_at = NOW() WHERE id = $2`, [newPriority, ticket.id]);
      }
    } else if (rec.type === 'escalation') {
      await query(`UPDATE tickets SET priority = 'critical', updated_at = NOW() WHERE id = $1`, [ticket.id]);
    }

    // Mark recommendation as applied
    await query(`
      UPDATE ai_recommendations 
      SET is_applied = TRUE, applied_by = $1, applied_at = NOW() 
      WHERE id = $2
    `, [req.user.id, id]);

    res.json({ success: true, message: 'Recommendation applied successfully' });
  } catch (error) { next(error); }
};

router.post('/recommendations/:id/apply', authenticate, authorize('admin'), applyRecommendationHandler);
router.put('/recommendations/:id/apply', authenticate, authorize('admin'), applyRecommendationHandler);

module.exports = router;
