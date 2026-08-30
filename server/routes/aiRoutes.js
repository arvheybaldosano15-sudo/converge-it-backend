const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const aiService = require('../services/aiService');

router.get('/recommendations', authenticate, authorize('admin'), aiLimiter, async (req, res, next) => {
  try {
    // 1. Fetch active tickets
    const ticketsRes = await query(`
      SELECT t.id, t.ticket_number, t.subject, t.priority, t.status, t.created_at, 
             t.assigned_technician_id, t.service_category_id, cat.name AS category_name
      FROM tickets t 
      LEFT JOIN service_categories cat ON t.service_category_id = cat.id 
      WHERE t.status NOT IN ('resolved', 'closed', 'cancelled')
      ORDER BY t.created_at ASC
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

    // Delete existing unapplied recommendations to avoid duplication
    await query(`DELETE FROM ai_recommendations WHERE is_applied = FALSE`);

    // Generate new recommendations
    for (const ticket of activeTickets) {
      // Rule 1: Ticket is Unassigned -> Suggest assignment
      if (!ticket.assigned_technician_id && technicians.length > 0) {
        // Find best matching tech or lowest workload tech
        let selectedTech = technicians[0]; // fallback to lowest workload
        const matchingTech = technicians.find(t => 
          t.specialization && 
          ticket.category_name && 
          t.specialization.toLowerCase().includes(ticket.category_name.toLowerCase())
        );
        if (matchingTech) {
          selectedTech = matchingTech;
        }

        const suggestion = `Assign ticket ${ticket.ticket_number} to ${selectedTech.full_name}`;
        const reasoning = `Ticket is currently unassigned. ${selectedTech.full_name} has matching specialization or the lowest workload (${selectedTech.workload} active tickets).`;
        const type = 'reassignment';
        const confidence = matchingTech ? 95.00 : 80.00;

        await query(`
          INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
          VALUES ($1, $2, $3, $4, $5)
        `, [ticket.id, type, suggestion, reasoning, confidence]);
        continue;
      }

      // Rule 2: Ticket SLA / Delay warning -> Suggest priority change
      const openDurationHours = (new Date() - new Date(ticket.created_at)) / (1000 * 60 * 60);
      if (openDurationHours > 12 && ticket.priority === 'low') {
        const suggestion = `Upgrade priority of ${ticket.ticket_number} to medium`;
        const reasoning = `This ticket has been unresolved for ${Math.round(openDurationHours)} hours, exceeding the standard SLA target for low-priority tickets.`;
        const type = 'priority_change';
        const confidence = 85.00;

        await query(`
          INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
          VALUES ($1, $2, $3, $4, $5)
        `, [ticket.id, type, suggestion, reasoning, confidence]);
        continue;
      }

      if (openDurationHours > 24 && ticket.priority === 'medium') {
        const suggestion = `Upgrade priority of ${ticket.ticket_number} to high`;
        const reasoning = `This medium-priority ticket has remained in progress for ${Math.round(openDurationHours)} hours. Upgrading priority will escalate response time.`;
        const type = 'priority_change';
        const confidence = 90.00;

        await query(`
          INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
          VALUES ($1, $2, $3, $4, $5)
        `, [ticket.id, type, suggestion, reasoning, confidence]);
        continue;
      }

      // Rule 3: High Priority Delay -> Suggest escalation
      if (openDurationHours > 48 && ticket.priority === 'high') {
        const suggestion = `Escalate ticket ${ticket.ticket_number} to critical`;
        const reasoning = `High priority ticket has been pending for over 48 hours. Suggest immediate escalation and attention from management.`;
        const type = 'escalation';
        const confidence = 95.00;

        await query(`
          INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
          VALUES ($1, $2, $3, $4, $5)
        `, [ticket.id, type, suggestion, reasoning, confidence]);
        continue;
      }
    }

    // Return the generated recommendations joined with ticket details
    const finalRecs = await query(`
      SELECT r.*, t.ticket_number 
      FROM ai_recommendations r
      JOIN tickets t ON r.ticket_id = t.id
      WHERE r.is_applied = FALSE
      ORDER BY r.confidence DESC, r.created_at DESC
    `);

    res.json({ success: true, data: finalRecs.rows });
  } catch (error) { next(error); }
});

router.put('/recommendations/:id/apply', authenticate, authorize('admin'), async (req, res, next) => {
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
      // Suggestion: "Assign ticket CIT-YYYY-NNNN to [Tech Name]"
      const match = rec.suggestion.match(/to\s+(.+)$/i);
      if (match && match[1]) {
        const techName = match[1].trim();
        const techResult = await query(`SELECT id FROM users WHERE full_name = $1 AND role = 'technician'`, [techName]);
        if (techResult.rows[0]) {
          const techId = techResult.rows[0].id;
          // Check if the suggested technician is busy with an unresolved ticket
          const activeCheck = await query(
            `SELECT ticket_number FROM tickets 
             WHERE assigned_technician_id = $1 AND status NOT IN ('resolved', 'closed') AND id != $2`,
            [techId, ticket.id]
          );
          if (activeCheck.rows.length > 0) {
            return next({ statusCode: 400, message: `This technician is currently assigned to unresolved ticket ${activeCheck.rows[0].ticket_number} and cannot receive new assignments.` });
          }
          await query(`UPDATE tickets SET assigned_technician_id = $1, status = 'in_progress', updated_at = NOW() WHERE id = $2`, [techId, ticket.id]);
        } else {
          // Fallback to lowest workload active tech who is not currently busy with another unresolved ticket
          const lowestTechResult = await query(`
            SELECT u.id FROM users u 
            WHERE u.role = 'technician' AND u.status = 'active'
            AND NOT EXISTS (
              SELECT 1 FROM tickets t2 
              WHERE t2.assigned_technician_id = u.id AND t2.status NOT IN ('resolved', 'closed') AND t2.id != $1
            )
            LIMIT 1
          `, [ticket.id]);
          if (lowestTechResult.rows[0]) {
            await query(`UPDATE tickets SET assigned_technician_id = $1, status = 'in_progress', updated_at = NOW() WHERE id = $2`, [lowestTechResult.rows[0].id, ticket.id]);
          } else {
            return next({ statusCode: 400, message: 'All technicians are currently busy with unresolved tickets. Cannot assign.' });
          }
        }
      }
    } else if (rec.type === 'priority_change') {
      // Suggestion: "Upgrade priority of CIT-YYYY-NNNN to [medium/high]"
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
});

module.exports = router;
