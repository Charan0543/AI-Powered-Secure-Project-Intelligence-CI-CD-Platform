/**
 * Server-Trusted Tenant Resolution Guard
 * Resolves organization context strictly from server-validated memberships.
 * Client headers (x-tenant-id) are treated only as hints and are strictly verified.
 */

const defaultPrisma = require('../db');
const { logAuditEvent } = require('../utils/auditLogger');

async function requireTenant(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required for tenant context.' });
    }

    // Optional hint from client, otherwise fallback to session activeOrgId or primary active membership
    const requestedOrgId = (
      req.headers['x-tenant-id'] ||
      req.params.orgId ||
      req.query.orgId ||
      req.session.activeOrgId ||
      (req.user.memberships && req.user.memberships[0] ? req.user.memberships[0].organizationId : null)
    );

    if (!requestedOrgId) {
      return res.status(400).json({
        error: 'No active organization context found. Please select or join an organization.',
        code: 'NO_TENANT',
      });
    }

    // Strict Server-Side Verification: Check membership in target organization
    const membership = await defaultPrisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: req.user.id,
          organizationId: requestedOrgId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      await logAuditEvent({
        actorId: req.user.id,
        actorEmail: req.user.email,
        tenantId: requestedOrgId,
        action: 'ACCESS_DENIED',
        targetType: 'TENANT',
        targetId: requestedOrgId,
        metadata: { reason: 'Cross-tenant or inactive membership attempt' },
        ipAddress: req.ip,
      });

      return res.status(403).json({
        error: 'Access denied: You are not an active member of this organization.',
        code: 'CROSS_TENANT_FORBIDDEN',
      });
    }

    // Check if organization is suspended
    if (membership.organization.status === 'SUSPENDED' || membership.organization.status === 'REMOVED') {
      return res.status(403).json({
        error: 'This organization has been suspended. Please contact Nexorian support.',
        code: 'ORGANIZATION_SUSPENDED',
      });
    }

    req.tenant = membership.organization;
    req.membership = membership;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resolve tenant context.' });
  }
}

module.exports = {
  requireTenant,
};