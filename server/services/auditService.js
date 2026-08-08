const { query } = require('../config/database');
const logger = require('../config/logger');

exports.logAudit = async ({
  actorId, actorName, actorRole, action, targetType,
  targetId, targetDescription, oldValues, newValues, ipAddress, userAgent
}) => {
  try {
    await query(
      `INSERT INTO audit_logs (performed_by, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        actorId || null,
        action,
        targetType || null,
        targetId || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null
      ]
    );
  } catch (error) {
    logger.error('Failed to log audit entry:', error);
  }
};
