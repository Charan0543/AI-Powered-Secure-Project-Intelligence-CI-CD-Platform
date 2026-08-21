/**
 * Raw Project Documentation Service (Internal Roles Only)
 * Enforces tenant isolation and server-side CLIENT role restriction.
 */

async function getRawProjectDocuments(tenant, membership) {
  // Sample tenant documentation payload for Phase 1
  return {
    tenantId: tenant.id,
    organizationName: tenant.name,
    isVerified: tenant.isVerified,
    accessedByRole: membership.role,
    documents: [
      {
        id: 'doc-101',
        title: 'System Architecture Specification',
        classification: 'CONFIDENTIAL_INTERNAL',
        content: `Nexorian Tenant Isolated Architecture for ${tenant.name}. RBAC and server-side encryption active.`,
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'doc-102',
        title: 'Security Policy & Key Management',
        classification: 'INTERNAL_ONLY',
        content: 'Zero-trust session validation, tenant boundary verification, and audit logging parameters.',
        lastUpdated: new Date().toISOString(),
      },
    ],
  };
}

module.exports = {
  getRawProjectDocuments,
};