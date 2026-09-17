const logger = require('../config/logger');

// Local in-memory ring buffer for audit logs (max 500 entries)
// Completely disconnected from Supabase DB to eliminate egress & speed up API operations
const auditMemoryLogs = [];
const MAX_AUDIT_LOGS = 500;

exports.logAudit = async ({
  actorId, actorName, actorRole, action, targetType,
  targetId, targetDescription, oldValues, newValues, ipAddress, userAgent
}) => {
  try {
    const entry = {
      id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      actor_id: actorId || null,
      actor_name: actorName || 'System',
      performed_by: actorId || null,
      actor_role: actorRole || 'system',
      action: action || 'update',
      target_type: targetType || 'system',
      entity_type: targetType || 'system',
      target_id: targetId || null,
      entity_id: targetId || null,
      target_description: targetDescription || (targetType ? `${targetType} #${targetId || ''}` : ''),
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      created_at: new Date().toISOString(),
    };

    // Store in local memory log array
    auditMemoryLogs.unshift(entry);
    if (auditMemoryLogs.length > MAX_AUDIT_LOGS) {
      auditMemoryLogs.pop();
    }

    // Write to local winston log file (offline, zero Supabase egress)
    logger.info(`[AUDIT] ${actorName || 'System'} (${actorRole || 'system'}) performed ${action} on ${targetType || 'system'} #${targetId || ''}`);
  } catch (error) {
    logger.warn('Local audit log failed:', error.message);
  }
};

exports.getAuditMemoryLogs = () => auditMemoryLogs;
