/**
 * Nexorian Verification Service (Staff Only)
 * Independent manual review workflow for organization trust badges and fraud mitigation.
 */

const defaultPrisma = require('../db');
const { logAuditEvent } = require('../utils/auditLogger');

/** Fetches queue of verification requests for Nexorian staff review */
async function getVerificationQueue(filterStatus = null, client = defaultPrisma) {
  let whereClause;
  if (!filterStatus || filterStatus === 'PENDING_REVIEW') {
    // By default, only show cases needing manual review
    whereClause = { status: { in: ['NEEDS_MANUAL_REVIEW', 'SUBMITTED', 'MORE_INFO_REQUESTED'] } };
  } else if (filterStatus === 'ALL') {
    whereClause = {};
  } else {
    whereClause = { status: filterStatus };
  }
  return client.verificationRequest.findMany({
    where: whereClause,
    include: {
      organization: {
        include: {
          memberships: {
            where: { role: 'FOUNDER' },
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      decisions: {
        orderBy: { decidedAt: 'desc' },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });
}

/** Fetches detailed review profile for a single verification request */
async function getVerificationDetail(requestId, client = defaultPrisma) {
  const request = await client.verificationRequest.findUnique({
    where: { id: requestId },
    include: {
      organization: {
        include: {
          memberships: {
            include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
          },
          invites: true,
        },
      },
      decisions: {
        orderBy: { decidedAt: 'desc' },
      },
    },
  });

  if (!request) {
    const err = new Error('Verification request not found.');
    err.statusCode = 404;
    throw err;
  }

  return request;
}

/** Records a staff manual verification decision */
async function submitManualDecision(requestId, staffUser, { decision, rationale }, client = defaultPrisma) {
  const validDecisions = ['APPROVED', 'REJECTED', 'MORE_INFO_REQUESTED'];
  if (!validDecisions.includes(decision)) {
    const err = new Error(`Invalid decision. Must be one of: ${validDecisions.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const request = await client.verificationRequest.findUnique({
    where: { id: requestId },
    include: { organization: true },
  });

  if (!request) {
    const err = new Error('Verification request not found.');
    err.statusCode = 404;
    throw err;
  }

  const result = await client.$transaction(async (tx) => {
    // 1. Create Decision record
    const decisionRecord = await tx.verificationDecision.create({
      data: {
        verificationRequestId: requestId,
        reviewerId: staffUser.id,
        decision,
        rationale: rationale || 'Manual review completed by staff',
      },
    });

    // 2. Update VerificationRequest status
    const updatedRequest = await tx.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        reviewNotes: rationale || null,
      },
    });

    // 3. Update Organization status and badge based on decision
    let orgUpdates = {};
    if (decision === 'APPROVED') {
      orgUpdates = { isVerified: true, status: 'ACTIVE' };
    } else if (decision === 'REJECTED') {
      // Reject only clear abuse/fraud/invalid data -> suspend
      orgUpdates = { isVerified: false, status: 'SUSPENDED' };
    } else if (decision === 'MORE_INFO_REQUESTED') {
      orgUpdates = { isVerified: false };
    }

    const updatedOrg = await tx.organization.update({
      where: { id: request.organizationId },
      data: orgUpdates,
    });

    return { decisionRecord, updatedRequest, updatedOrg };
  });

  // Mandatory Audit Log
  await logAuditEvent({
    actorId: staffUser.id,
    actorEmail: staffUser.email,
    tenantId: request.organizationId,
    action: 'VERIFICATION_MANUAL_DECISION',
    targetType: 'VERIFICATION_REQUEST',
    targetId: requestId,
    metadata: {
      decision,
      rationale,
      isVerified: result.updatedOrg.isVerified,
      orgStatus: result.updatedOrg.status,
    },
  }, client);

  return result;
}

module.exports = {
  getVerificationQueue,
  getVerificationDetail,
  submitManualDecision,
};