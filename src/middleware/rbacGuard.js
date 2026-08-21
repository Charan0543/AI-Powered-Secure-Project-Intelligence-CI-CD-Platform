/**
 * Role-Based Access Control (RBAC) Guards
 * Enforces explicit role permissions, staff isolation, and backend raw docs protection.
 */

const { logAuditEvent } = require('../utils/auditLogger');

/** Higher roles that inherit owner capabilities */
const OWNER_ROLES = new Set(['FOUNDER', 'ORG_OWNER']);

/** Enforces that the caller has one of the allowed roles in the active tenant */
function requireRole(allowedRoles = []) {
  return async (req, res, next) => {
    if (!req.membership) {
      return res.status(403).json({ error: 'Tenant membership context required for role verification.' });
    }

    const userRole = req.membership.role;
    let isAuthorized = allowedRoles.includes(userRole);

    // Founders and Org Owners can perform actions allowed for Admin / Org Owner
    if (!isAuthorized && OWNER_ROLES.has(userRole)) {
      if (allowedRoles.includes('ORG_OWNER') || allowedRoles.includes('ADMIN') || allowedRoles.includes('MEMBER')) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      await logAuditEvent({
        actorId: req.user ? req.user.id : null,
        actorEmail: req.user ? req.user.email : null,
        tenantId: req.tenant ? req.tenant.id : null,
        action: 'ACCESS_DENIED',
        targetType: 'ROLE_GUARD',
        targetId: userRole,
        metadata: { allowedRoles, userRole, path: req.originalUrl },
        ipAddress: req.ip,
      });

      return res.status(403).json({
        error: `Access denied: Your role (${userRole}) does not have permission for this operation.`,
        code: 'INSUFFICIENT_ROLE_PERMISSIONS',
      });
    }

    next();
  };
}

/** Enforces Nexorian Staff access (independent of tenant) */
async function requireNexorianStaff(req, res, next) {
  if (!req.user || !req.user.isNexorianStaff) {
    await logAuditEvent({
      actorId: req.user ? req.user.id : null,
      actorEmail: req.user ? req.user.email : null,
      action: 'ACCESS_DENIED',
      targetType: 'STAFF_GUARD',
      metadata: { path: req.originalUrl, reason: 'Non-staff attempted staff route' },
      ipAddress: req.ip,
    });

    return res.status(403).json({
      error: 'Access denied: Nexorian staff authorization required.',
      code: 'STAFF_FORBIDDEN',
    });
  }
  next();
}

/** Server-side guard: Prohibits CLIENT role from accessing raw documentation */
async function requireDocsAccess(req, res, next) {
  if (!req.membership) {
    return res.status(403).json({ error: 'Tenant membership required.' });
  }

  if (req.membership.role === 'CLIENT') {
    await logAuditEvent({
      actorId: req.user.id,
      actorEmail: req.user.email,
      tenantId: req.tenant ? req.tenant.id : null,
      action: 'DOCS_ACCESS_DENIED_CLIENT',
      targetType: 'DOCS',
      metadata: { role: 'CLIENT', path: req.originalUrl },
      ipAddress: req.ip,
    });

    return res.status(403).json({
      error: 'Access denied: Client role accounts are not permitted to view raw project documentation.',
      code: 'DOCS_CLIENT_FORBIDDEN',
    });
  }

  next();
}

module.exports = {
  requireRole,
  requireNexorianStaff,
  requireDocsAccess,
};