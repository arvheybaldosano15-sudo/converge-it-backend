const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { query } = require('../config/database');
const aiService = require('../services/aiService');

/**
 * Intelligent Specialization Matcher for AI Recommendations
 * Matches ticket category, concern, and problem description with technician specializations.
 * Strictly prioritizes technicians specialized in the domain (e.g. CCTV System -> CCTV Systems).
 */
function findSpecializationMatch(ticket, availableTechs) {
  if (!availableTechs || availableTechs.length === 0) return null;

  const catName = (ticket.category_name || '').toLowerCase();
  const subject = (ticket.subject || '').toLowerCase();
  const desc = (ticket.description || '').toLowerCase();
  const fullText = `${catName} ${subject} ${desc}`;

  // 1. CCTV System Match (Strictly prioritizes CCTV technicians)
  if (catName.includes('cctv') || fullText.includes('cctv') || fullText.includes('camera') || fullText.includes('surveillance')) {
    const cctvTechs = availableTechs.filter(t => {
      const s = (t.specialization || '').toLowerCase();
      return s.includes('cctv') || s.includes('camera') || s.includes('security');
    });
    if (cctvTechs.length > 0) {
      cctvTechs.sort((a, b) => parseInt(a.workload, 10) - parseInt(b.workload, 10));
      return {
        tech: cctvTechs[0],
        matchType: 'specialization',
        matchedCategory: 'CCTV System',
        specialization: cctvTechs[0].specialization,
        confidence: 96.00
      };
    }
  }

  // 2. Starlink Internet & Network Issues Match
  if (catName.includes('starlink') || catName.includes('network') || catName.includes('internet') ||
      fullText.includes('starlink') || fullText.includes('wifi') || fullText.includes('internet') ||
      fullText.includes('connection') || fullText.includes('mabagal') || fullText.includes('putol') ||
      fullText.includes('red light') || fullText.includes('los') || fullText.includes('signal')) {
    const starlinkTechs = availableTechs.filter(t => {
      const s = (t.specialization || '').toLowerCase();
      return s.includes('starlink') || s.includes('network') || s.includes('internet');
    });
    if (starlinkTechs.length > 0) {
      starlinkTechs.sort((a, b) => parseInt(a.workload, 10) - parseInt(b.workload, 10));
      return {
        tech: starlinkTechs[0],
        matchType: 'specialization',
        matchedCategory: 'Starlink Internet',
        specialization: starlinkTechs[0].specialization,
        confidence: 95.00
      };
    }
  }

  // 3. Smart Devices & IoT Match
  if (catName.includes('smart') || fullText.includes('smart') || fullText.includes('iot') ||
      fullText.includes('finger print') || fullText.includes('fingerprint') || fullText.includes('biometric') ||
      fullText.includes('device') || fullText.includes('sensor')) {
    const smartTechs = availableTechs.filter(t => {
      const s = (t.specialization || '').toLowerCase();
      return s.includes('smart') || s.includes('iot') || s.includes('device');
    });
    if (smartTechs.length > 0) {
      smartTechs.sort((a, b) => parseInt(a.workload, 10) - parseInt(b.workload, 10));
      return {
        tech: smartTechs[0],
        matchType: 'specialization',
        matchedCategory: 'Smart Devices & IoT',
        specialization: smartTechs[0].specialization,
        confidence: 95.00
      };
    }
  }

  // 4. Installation Request & General Installation Match
  if (catName.includes('installation') || fullText.includes('installation') || fullText.includes('kabit') || fullText.includes('apply')) {
    const installTechs = availableTechs.filter(t => {
      const s = (t.specialization || '').toLowerCase();
      return s.includes('installation') || s.includes('install');
    });
    if (installTechs.length > 0) {
      installTechs.sort((a, b) => parseInt(a.workload, 10) - parseInt(b.workload, 10));
      return {
        tech: installTechs[0],
        matchType: 'specialization',
        matchedCategory: 'General Installation',
        specialization: installTechs[0].specialization,
        confidence: 94.00
      };
    }
  }

  // 5. Normalized direct match fallback
  const directMatch = availableTechs.find(t => {
    const s = (t.specialization || '').toLowerCase().replace(/systems?/g, '').trim();
    const c = catName.replace(/systems?/g, '').trim();
    return s && c && (s.includes(c) || c.includes(s));
  });
  if (directMatch) {
    return {
      tech: directMatch,
      matchType: 'specialization',
      matchedCategory: ticket.category_name || 'Technical Support',
      specialization: directMatch.specialization,
      confidence: 92.00
    };
  }

  // 6. Lowest Workload Fallback
  return {
    tech: availableTechs[0],
    matchType: 'workload',
    matchedCategory: ticket.category_name || 'General Support',
    specialization: availableTechs[0].specialization,
    confidence: 85.00
  };
}

router.get('/recommendations', authenticate, authorize('admin'), aiLimiter, async (req, res, next) => {
  try {
    // 1. Fetch active unresolved tickets with customer & technician details
    const ticketsRes = await query(`
      SELECT t.id, t.ticket_number, t.subject, t.description, t.priority, t.status, t.created_at, t.sla_deadline,
             t.assigned_technician_id, t.service_category_id, cat.name AS category_name,
             u.full_name AS assignee_name,
             (
               SELECT COUNT(*) FROM tickets t2 
               WHERE t2.assigned_technician_id = t.assigned_technician_id 
                 AND t2.status::text NOT IN ('resolved', 'closed', 'cancelled')
             ) AS assignee_workload
      FROM tickets t 
      LEFT JOIN service_categories cat ON t.service_category_id = cat.id 
      LEFT JOIN users u ON t.assigned_technician_id = u.id
      WHERE t.status::text NOT IN ('resolved', 'closed', 'cancelled')
      ORDER BY t.created_at ASC
    `);

    // 2. Fetch active technicians with workload
    const techsRes = await query(`
      SELECT u.id, u.full_name, u.specialization,
             (SELECT COUNT(*) FROM tickets t2 WHERE t2.assigned_technician_id = u.id AND t2.status::text NOT IN ('resolved', 'closed', 'cancelled')) AS workload
      FROM users u 
      WHERE u.role = 'technician' AND u.status = 'active'
      ORDER BY workload ASC
    `);

    const activeTickets = ticketsRes.rows;
    const technicians = techsRes.rows;

    // Clear old unapplied recommendations for resolved/closed tickets
    await query(`
      DELETE FROM ai_recommendations 
      WHERE is_applied = FALSE 
         OR ticket_id IN (SELECT id FROM tickets WHERE status::text IN ('resolved', 'closed', 'cancelled'))
    `);

    // Evaluate rules for each active ticket
    for (const ticket of activeTickets) {
      const availableTechs = technicians.filter(t => parseInt(t.workload, 10) < 3);

      // Rule 1: Ticket is Unassigned -> Suggest Smart Assignment based on specialization
      if (!ticket.assigned_technician_id && availableTechs.length > 0) {
        const matchResult = findSpecializationMatch(ticket, availableTechs);
        const selectedTech = matchResult.tech;
        const isSpecMatch = matchResult.matchType === 'specialization';

        const categoryLabel = ticket.category_name || matchResult.matchedCategory || 'General Support';
        const specLabel = selectedTech.specialization || 'Support Technician';

        const suggestion = `Assign ticket ${ticket.ticket_number} to ${selectedTech.full_name} (${specLabel})`;
        const reasoning = isSpecMatch
          ? `🎯 Specialization Match: Ticket concern is categorized under "${categoryLabel}". ${selectedTech.full_name} specializes in "${specLabel}" with active workload of ${selectedTech.workload}/3 tickets.`
          : `⚡ Workload Optimization: No direct specialization match for category "${categoryLabel}". Recommended ${selectedTech.full_name} (${specLabel}) based on lowest active workload (${selectedTech.workload} active tickets).`;
        const type = 'reassignment';
        const confidence = matchResult.confidence;

        await query(`
          INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [ticket.id, type, suggestion, reasoning, confidence]);
        continue;
      }

      // Rule 2: Overloaded Technician -> Suggest Workload Rebalancing
      const currentWorkload = parseInt(ticket.assignee_workload || 0, 10);
      if (ticket.assigned_technician_id && currentWorkload >= 3 && availableTechs.length > 0) {
        const lighterTech = availableTechs.find(t => t.id !== ticket.assigned_technician_id && parseInt(t.workload, 10) <= 1);
        if (lighterTech) {
          const specLabel = lighterTech.specialization || 'Support Technician';
          const suggestion = `Reassign ticket ${ticket.ticket_number} from ${ticket.assignee_name} to ${lighterTech.full_name} (${specLabel})`;
          const reasoning = `⚡ Workload Balancing: ${ticket.assignee_name} is at maximum capacity (3 active tickets). ${lighterTech.full_name} specializes in "${specLabel}" with lower workload (${lighterTech.workload}/3 tickets).`;
          const type = 'workload_balancing';
          const confidence = 90.00;

          await query(`
            INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT DO NOTHING
          `, [ticket.id, type, suggestion, reasoning, confidence]);
          continue;
        }
      }

      // Rule 3: SLA Breach Risk -> Suggest Urgent Escalation
      const isBreachedOrNear = ticket.sla_deadline && new Date(ticket.sla_deadline) <= new Date(Date.now() + 6 * 3600 * 1000);
      if (isBreachedOrNear && ticket.priority !== 'critical') {
        const suggestion = `Escalate ticket ${ticket.ticket_number} priority to Critical`;
        const reasoning = `Ticket SLA deadline is nearing or breached. Immediate critical escalation recommended for swift resolution.`;
        const type = 'escalation';
        const confidence = 92.00;

        await query(`
          INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [ticket.id, type, suggestion, reasoning, confidence]);
        continue;
      }

      // Rule 4: Priority Adjustment for High-Severity Issues
      const textContent = `${ticket.subject || ''} ${ticket.description || ''}`.toLowerCase();
      const isHighSeverity = textContent.includes('outage') || textContent.includes('offline') || textContent.includes('no internet') || textContent.includes('no display');
      if (isHighSeverity && (ticket.priority === 'low' || ticket.priority === 'medium')) {
        const suggestion = `Escalate ticket ${ticket.ticket_number} priority to High`;
        const reasoning = `Ticket contains urgent failure indicators ("${textContent.includes('outage') ? 'outage' : 'offline'}"). High priority upgrade recommended.`;
        const type = 'priority_change';
        const confidence = 88.00;

        await query(`
          INSERT INTO ai_recommendations (ticket_id, type, suggestion, reasoning, confidence)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [ticket.id, type, suggestion, reasoning, confidence]);
        continue;
      }
    }

    // Return recommendations strictly for unresolved tickets
    const finalRecs = await query(`
      SELECT r.*, t.ticket_number, t.priority, t.subject AS ticket_subject,
             COALESCE(cat.name, 'General Support') AS category_name,
             t.created_at AS ticket_created_at
      FROM ai_recommendations r
      JOIN tickets t ON r.ticket_id = t.id
      LEFT JOIN service_categories cat ON t.service_category_id = cat.id
      WHERE r.is_applied = FALSE
        AND t.status::text NOT IN ('resolved', 'closed', 'cancelled')
      ORDER BY r.confidence DESC, r.created_at DESC
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

    if (rec.type === 'reassignment' || rec.type === 'workload_balancing') {
      // Parse the technician name from the suggestion text
      // Format: "Assign ticket TKT-123 to Michael Cordova (CCTV Systems)" or "Reassign ticket TKT-123 from X to Michael Cordova (CCTV Systems)"
      const match = rec.suggestion.match(/to\s+([^(]+)/i);
      if (match && match[1]) {
        const techName = match[1].replace(/\(.*?\)/g, '').trim();
        const techResult = await query(`SELECT id, full_name FROM users WHERE LOWER(TRIM(full_name)) = LOWER(TRIM($1)) AND role = 'technician'`, [techName]);
        if (techResult.rows[0]) {
          const techId = techResult.rows[0].id;
          const assignedTechName = techResult.rows[0].full_name || techName;
          const activeCheck = await query(
            `SELECT ticket_number FROM tickets 
             WHERE assigned_technician_id = $1 AND status::text NOT IN ('resolved', 'closed', 'cancelled') AND id != $2`,
            [techId, ticket.id]
          );
          if (activeCheck.rows.length >= 3) {
            return next({ statusCode: 400, message: `This technician currently has ${activeCheck.rows.length} active tickets and cannot receive new assignments (limit: 3 active tickets).` });
          }
          await query(`UPDATE tickets SET assigned_technician_id = $1, status = 'in_progress', updated_at = NOW() WHERE id = $2`, [techId, ticket.id]);
          try {
            const { clearTicketsCache } = require('../controllers/ticketController');
            if (typeof clearTicketsCache === 'function') clearTicketsCache();
            const { createNotification, notifyAdmins } = require('../services/notificationService');
            const { emitToUser, emitToAdmins, emitToRoom } = require('../services/socketService');

            // Notify ONLY the assigned technician (not shown in admin notification bell)
            await createNotification({
              userId: techId,
              type: 'ticket',
              title: `Ticket #${ticket.ticket_number} Assigned to You`,
              body: `Ticket #${ticket.ticket_number} (${ticket.subject}) has been assigned to you (${assignedTechName}).`,
              data: { ticketId: ticket.id, ticketNumber: ticket.ticket_number, technicianName: assignedTechName, assignedTo: techId },
              sendPush: true
            }).catch(() => {});

            await notifyAdmins({
              type: 'ticket',
              title: `Ticket #${ticket.ticket_number} Assigned to ${assignedTechName}`,
              body: `Ticket #${ticket.ticket_number} has been assigned to technician ${assignedTechName} via AI.`,
              data: { ticketId: ticket.id, ticketNumber: ticket.ticket_number, technicianName: assignedTechName, assignedTo: techId },
              sendPush: true
            }).catch(() => {});

            const { notifyAllDevicesOnAssignment } = require('../services/notificationService');
            notifyAllDevicesOnAssignment({
              ticketNumber: ticket.ticket_number,
              technicianName: assignedTechName,
              subject: ticket.subject,
              ticketId: ticket.id,
              assignedTo: techId
            }).catch(() => {});

            emitToUser(techId, 'ticket:assigned', { ticket: { ...ticket, assigned_technician_id: techId, status: 'in_progress', assigned_technician_name: assignedTechName }, technicianName: assignedTechName });
            emitToUser(techId, 'ticket:created', { ticket: { ...ticket, assigned_technician_id: techId, status: 'in_progress', assigned_technician_name: assignedTechName }, technicianName: assignedTechName });
            emitToAdmins('ticket:updated', { ticket: { ...ticket, assigned_technician_id: techId, status: 'in_progress', assigned_technician_name: assignedTechName } });
            emitToRoom(`ticket:${ticket.id}`, 'ticket:updated', { ticket: { ...ticket, assigned_technician_id: techId, status: 'in_progress', assigned_technician_name: assignedTechName } });
          } catch (_) {}
        } else {
          const lowestTechResult = await query(`
            SELECT u.id, u.full_name FROM users u 
            WHERE u.role = 'technician' AND u.status = 'active'
            AND (
              SELECT COUNT(*) FROM tickets t2 
              WHERE t2.assigned_technician_id = u.id AND t2.status::text NOT IN ('resolved', 'closed', 'cancelled') AND t2.id != $1
            ) < 3
            ORDER BY (
              SELECT COUNT(*) FROM tickets t2 
              WHERE t2.assigned_technician_id = u.id AND t2.status::text NOT IN ('resolved', 'closed', 'cancelled') AND t2.id != $1
            ) ASC
            LIMIT 1
          `, [ticket.id]);
          if (lowestTechResult.rows[0]) {
            const fallbackTechId = lowestTechResult.rows[0].id;
            const fallbackTechName = lowestTechResult.rows[0].full_name || 'Technician';
            await query(`UPDATE tickets SET assigned_technician_id = $1, status = 'in_progress', updated_at = NOW() WHERE id = $2`, [fallbackTechId, ticket.id]);
            try {
              const { clearTicketsCache } = require('../controllers/ticketController');
              if (typeof clearTicketsCache === 'function') clearTicketsCache();
              const { createNotification, notifyAdmins } = require('../services/notificationService');
              const { emitToUser, emitToAdmins, emitToRoom } = require('../services/socketService');

              // Notify ONLY the assigned technician (not shown in admin notification bell)
              await createNotification({
                userId: fallbackTechId,
                type: 'ticket',
                title: `Ticket #${ticket.ticket_number} Assigned to You`,
                body: `Ticket #${ticket.ticket_number} (${ticket.subject}) has been assigned to you (${fallbackTechName}).`,
                data: { ticketId: ticket.id, ticketNumber: ticket.ticket_number, technicianName: fallbackTechName, assignedTo: fallbackTechId },
                sendPush: true
              }).catch(() => {});

              await notifyAdmins({
                type: 'ticket',
                title: `Ticket #${ticket.ticket_number} Assigned to ${fallbackTechName}`,
                body: `Ticket #${ticket.ticket_number} has been assigned to technician ${fallbackTechName} via AI.`,
                data: { ticketId: ticket.id, ticketNumber: ticket.ticket_number, technicianName: fallbackTechName, assignedTo: fallbackTechId },
                sendPush: true
              }).catch(() => {});

              const { notifyAllDevicesOnAssignment: notifyAllFallback } = require('../services/notificationService');
              notifyAllFallback({
                ticketNumber: ticket.ticket_number,
                technicianName: fallbackTechName,
                subject: ticket.subject,
                ticketId: ticket.id,
                assignedTo: fallbackTechId
              }).catch(() => {});

              emitToUser(fallbackTechId, 'ticket:assigned', { ticket: { ...ticket, assigned_technician_id: fallbackTechId, status: 'in_progress', assigned_technician_name: fallbackTechName }, technicianName: fallbackTechName });
              emitToUser(fallbackTechId, 'ticket:created', { ticket: { ...ticket, assigned_technician_id: fallbackTechId, status: 'in_progress', assigned_technician_name: fallbackTechName }, technicianName: fallbackTechName });
              emitToAdmins('ticket:updated', { ticket: { ...ticket, assigned_technician_id: fallbackTechId, status: 'in_progress', assigned_technician_name: fallbackTechName } });
              emitToRoom(`ticket:${ticket.id}`, 'ticket:updated', { ticket: { ...ticket, assigned_technician_id: fallbackTechId, status: 'in_progress', assigned_technician_name: fallbackTechName } });
            } catch (_) {}
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
