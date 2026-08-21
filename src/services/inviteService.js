/**
 * Invite Service for Nexorian Phase 1
 * Implements secure, single-use, short-lived tokenized worker and client onboarding.
 */

const defaultPrisma = require('../db');
const { generateInvitationToken } = require('../utils/authCrypto');
const { logAuditEvent } = require('../utils/auditLogger');
const { logger } = require('../utils/logger');
const { sendInvitationEmail } = require('./emailService');
const { resolvePortalUrl } = require('./authService');

const ALLOWED_INVITE_ROLES = new Set(['ADMIN', 'MEMBER', 'CLIENT']);

/** Creates and sends a secure single-use organization invite */
async function createInvite({
  organizationId,
  email,
  role = 'MEMBER',
  invitedByUser,
}, client = defaultPrisma) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const upperRole = role.toUpperCase();

  if (!ALLOWED_INVITE_ROLES.has(upperRole)) {
    const err = new Error(`Invalid invite role. Allowed roles: ${Array.from(ALLOWED_INVITE_ROLES).join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // Check if user is already an active member of this org
  const existingUser = await client.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    const existingMembership = await client.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: existingUser.id,
          organizationId,
        },
      },
    });
    if (existingMembership && existingMembership.status === 'ACTIVE') {
      const err = new Error('This user is already an active member of this organization.');
      err.statusCode = 409;
      throw err;
    }
  }

  // 7-day expiration
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = generateInvitationToken();

  const invite = await client.invite.create({
    data: {
      token,
      email: normalizedEmail,
      role: upperRole,
      status: 'PENDING',
      expiresAt,
      organizationId,
      invitedById: invitedByUser.id,
    },
    include: { organization: true },
  });

  // Mandatory Audit Log
  await logAuditEvent({
    actorId: invitedByUser.id,
    actorEmail: invitedByUser.email,
    tenantId: organizationId,
    action: 'INVITE_CREATED',
    targetType: 'INVITE',
    targetId: invite.id,
    metadata: { email: normalizedEmail, role: upperRole, expiresAt },
  }, client);

  // Send invite email
  await sendInvitationEmail(normalizedEmail, token, invite.organization.name, upperRole).catch(err => {
    logger.warn('Failed to send invitation email', err);
  });

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    token: invite.token,
    expiresAt: invite.expiresAt,
  };
}

/** Validates invite token status, expiration, and returns organization details */
async function validateInviteToken(token, client = defaultPrisma) {
  if (!token || typeof token !== 'string') {
    const err = new Error('Invitation token is required.');
    err.statusCode = 400;
    throw err;
  }

  const invite = await client.invite.findUnique({
    where: { token: token.trim() },
    include: { organization: true },
  });

  if (!invite) {
    const err = new Error('Invitation not found or invalid.');
    err.statusCode = 404;
    throw err;
  }

  if (invite.status === 'USED' || invite.status === 'ACCEPTED') {
    const err = new Error('This invitation has already been accepted and used.');
    err.statusCode = 410;
    err.code = 'INVITE_ALREADY_USED';
    throw err;
  }

  if (invite.status === 'REVOKED') {
    const err = new Error('This invitation was revoked by the organization owner.');
    err.statusCode = 410;
    err.code = 'INVITE_REVOKED';
    throw err;
  }

  if (new Date() > new Date(invite.expiresAt)) {
    if (invite.status === 'PENDING') {
      await client.invite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
    }
    const err = new Error('This invitation has expired. Please ask an owner to send a new invite.');
    err.statusCode = 410;
    err.code = 'INVITE_EXPIRED';
    throw err;
  }

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt,
    organization: {
      id: invite.organization.id,
      name: invite.organization.name,
      slug: invite.organization.slug,
      isVerified: invite.organization.isVerified,
      status: invite.organization.status,
    },
  };
}

/** Accepts invitation for authenticated user, creates membership, and invalidates token */
async function acceptInvite({ token, user }, client = defaultPrisma) {
  const validated = await validateInviteToken(token, client);

  const result = await client.$transaction(async (tx) => {
    // 1. Mark invite as USED immediately to prevent replay
    const updatedInvite = await tx.invite.update({
      where: { token: token.trim() },
      data: { status: 'USED' },
    });

    // 2. Create or activate Membership
    const membership = await tx.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: validated.organization.id,
        },
      },
      update: {
        role: validated.role,
        status: 'ACTIVE',
      },
      create: {
        userId: user.id,
        organizationId: validated.organization.id,
        role: validated.role,
        status: 'ACTIVE',
      },
    });

    return { updatedInvite, membership };
  });

  // Mandatory Audit Log
  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    tenantId: validated.organization.id,
    action: 'INVITE_ACCEPTED',
    targetType: 'MEMBERSHIP',
    targetId: result.membership.id,
    metadata: { role: validated.role, inviteId: validated.id },
  }, client);

  const redirectUrl = resolvePortalUrl(validated.role, user.isNexorianStaff);

  return {
    success: true,
    organization: validated.organization,
    role: validated.role,
    membership: result.membership,
    redirectUrl,
  };
}

/** Revokes an active invitation */
async function revokeInvite(inviteId, actorUser, client = defaultPrisma) {
  const invite = await client.invite.findUnique({ where: { id: inviteId } });
  if (!invite) {
    const err = new Error('Invite not found.');
    err.statusCode = 404;
    throw err;
  }

  const updated = await client.invite.update({
    where: { id: inviteId },
    data: { status: 'REVOKED' },
  });

  await logAuditEvent({
    actorId: actorUser.id,
    actorEmail: actorUser.email,
    tenantId: invite.organizationId,
    action: 'INVITE_REVOKED',
    targetType: 'INVITE',
    targetId: inviteId,
  }, client);

  return updated;
}

module.exports = {
  createInvite,
  validateInviteToken,
  acceptInvite,
  revokeInvite,
};