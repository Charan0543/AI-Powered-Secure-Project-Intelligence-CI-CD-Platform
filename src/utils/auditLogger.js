/**
 * Centralized Mandatory Audit Logger for Nexorian
 * Records all sensitive actions, state transitions, and access denials.
 */

const defaultPrisma = require('../db');
const { logger } = require('./logger');

async function logAuditEvent({
  actorId = null,
  actorEmail = null,
  tenantId = null,
  action,
  targetType = 'SYSTEM',
  targetId = null,
  metadata = {},
  ipAddress = null,
}, client = defaultPrisma) {
  try {
    const metadataStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    const validActorId = (actorId && actorId !== 'SYSTEM') ? actorId : null;
    const resolvedActorEmail = actorEmail || (actorId === 'SYSTEM' ? 'system@nexorian.internal' : null);

    const logRecord = await client.auditLog.create({
      data: {
        actorId: validActorId,
        actorEmail: resolvedActorEmail,
        tenantId,
        action,
        targetType,
        targetId,
        metadata: metadataStr,
        ipAddress,
      },
    });

    logger.info(`[AUDIT] ${action}`, {
      actorId,
      actorEmail,
      tenantId,
      targetType,
      targetId,
      metadata,
    });

    return logRecord;
  } catch (err) {
    logger.error('Failed to write audit log', err);
    return null;
  }
}

module.exports = {
  logAuditEvent,
};