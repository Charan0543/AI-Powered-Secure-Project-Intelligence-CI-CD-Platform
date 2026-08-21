/**
 * Organization Service for Nexorian Phase 1
 * Implements dedicated onboarding, hybrid verification evaluation, and tenant management.
 */

const defaultPrisma = require('../db');
const crypto = require('crypto');
const { hashPassword, generateVerificationCode } = require('../utils/authCrypto');
const { logAuditEvent } = require('../utils/auditLogger');
const { logger } = require('../utils/logger');
const { sendVerificationOtpEmail } = require('./emailService');

// Common disposable or generic free webmail domains
const GENERIC_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'mail.com',
  'protonmail.com',
  'tempmail.com',
  '10minutemail.com',
  'mailinator.com',
]);

/** Evaluates hybrid trust score for an organization creation request */
function evaluateVerificationSignals({ companyEmail, domain, creatorEmail, orgName }) {
  const signals = [];
  let score = 0;

  const compDomain = (domain || companyEmail.split('@')[1] || '').toLowerCase().trim();
  const creatDomain = (creatorEmail.split('@')[1] || '').toLowerCase().trim();

  // 1. Check corporate domain (non-generic, non-disposable)
  const isCorporateDomain = compDomain.includes('.') && !GENERIC_DOMAINS.has(compDomain);
  if (isCorporateDomain) {
    score += 45;
    signals.push({ signal: 'CORPORATE_DOMAIN_VERIFIED', weight: 45, passed: true });
  } else {
    signals.push({ signal: 'GENERIC_OR_FREE_DOMAIN', weight: 0, passed: false });
  }

  // 2. Check if creator email matches company domain
  if (creatDomain && compDomain && creatDomain === compDomain) {
    score += 35;
    signals.push({ signal: 'CREATOR_EMAIL_DOMAIN_MATCH', weight: 35, passed: true });
  } else {
    signals.push({ signal: 'CREATOR_EMAIL_DOMAIN_MISMATCH', weight: 0, passed: false });
  }

  // 3. Check profile completeness
  if (orgName && orgName.trim().length >= 3 && companyEmail.includes('@')) {
    score += 20;
    signals.push({ signal: 'PROFILE_COMPLETENESS', weight: 20, passed: true });
  }

  const isAutoApproved = score >= 80;
  return {
    score,
    isAutoApproved,
    signals,
  };
}

/** Registers a new organization, founder account, membership, and verification request */
async function createOrganization({
  orgName,
  slug,
  companyEmail,
  creatorName,
  creatorEmail,
  creatorPassword,
}, client = defaultPrisma) {
  const normalizedOrgEmail = companyEmail.trim().toLowerCase();
  const normalizedCreatorEmail = creatorEmail.trim().toLowerCase();
  const normalizedSlug = slug.trim().toLowerCase();
  const domain = normalizedOrgEmail.split('@')[1] || '';

  // Check duplicate slug
  const existingOrg = await client.organization.findUnique({ where: { slug: normalizedSlug } });
  if (existingOrg) {
    const err = new Error('An organization with this slug/URL already exists.');
    err.statusCode = 409;
    err.field = 'slug';
    throw err;
  }

  // Check verification scoring
  const evalResult = evaluateVerificationSignals({
    companyEmail: normalizedOrgEmail,
    domain,
    creatorEmail: normalizedCreatorEmail,
    orgName,
  });

  // Organization Status Policy:
  // If high confidence -> Auto-Approved badge (isVerified = true).
  // If startup/generic domain -> Active platform access without badge (isVerified = false, status = ACTIVE).
  const isVerified = evalResult.isAutoApproved;
  const verificationStatus = evalResult.isAutoApproved ? 'AUTO_APPROVED' : 'NEEDS_MANUAL_REVIEW';
  const orgStatus = 'ACTIVE';

  // Execute transactional creation
  const result = await client.$transaction(async (tx) => {
    // 1. Find or create user
    let user = await tx.user.findUnique({ where: { email: normalizedCreatorEmail } });
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    if (user) {
      if (!user.isEmailVerified && creatorPassword) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            name: creatorName,
            passwordHash: hashPassword(creatorPassword),
            verificationCode,
            verificationCodeExpires,
          },
        });
      }
    } else {
      user = await tx.user.create({
        data: {
          name: creatorName,
          email: normalizedCreatorEmail,
          passwordHash: hashPassword(creatorPassword),
          isEmailVerified: false,
          verificationCode,
          verificationCodeExpires,
        },
      });
    }

    // 2. Create Organization
    const organization = await tx.organization.create({
      data: {
        name: orgName,
        slug: normalizedSlug,
        companyEmail: normalizedOrgEmail,
        domain,
        status: orgStatus,
        isVerified,
      },
    });

    // 3. Create Membership with FOUNDER role
    const membership = await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'FOUNDER',
        status: 'ACTIVE',
      },
    });

    // 4. Create VerificationRequest
    const verificationRequest = await tx.verificationRequest.create({
      data: {
        organizationId: organization.id,
        status: verificationStatus,
        confidenceScore: evalResult.score,
        autoApproveSignals: JSON.stringify(evalResult.signals),
      },
    });

    return { user, organization, membership, verificationRequest, verificationCode };
  });

  // Mandatory Audit Logs
  await logAuditEvent({
    actorId: result.user.id,
    actorEmail: result.user.email,
    tenantId: result.organization.id,
    action: 'ORG_CREATED',
    targetType: 'ORGANIZATION',
    targetId: result.organization.id,
    metadata: { name: orgName, slug: normalizedSlug, status: orgStatus, isVerified },
  }, client);

  await logAuditEvent({
    actorId: result.user.id,
    actorEmail: result.user.email,
    tenantId: result.organization.id,
    action: 'VERIFICATION_SUBMITTED',
    targetType: 'VERIFICATION_REQUEST',
    targetId: result.verificationRequest.id,
    metadata: { score: evalResult.score, initialStatus: verificationStatus },
  }, client);

  if (isVerified) {
    await logAuditEvent({
      actorId: 'SYSTEM',
      tenantId: result.organization.id,
      action: 'ORG_AUTO_APPROVED',
      targetType: 'ORGANIZATION',
      targetId: result.organization.id,
      metadata: { score: evalResult.score, signals: evalResult.signals },
    }, client);
  }

  // Send verification OTP email to founder
  if (!result.user.isEmailVerified) {
    await sendVerificationOtpEmail(normalizedCreatorEmail, result.verificationCode, creatorName).catch(err => {
      logger.warn('Failed to send founder verification OTP email', err);
    });
  }

  return {
    success: true,
    organization: result.organization,
    user: { id: result.user.id, name: result.user.name, email: result.user.email, isEmailVerified: result.user.isEmailVerified },
    membership: result.membership,
    verificationRequest: result.verificationRequest,
    isVerified,
    verificationStatus,
    status: result.user.isEmailVerified ? 'ACTIVE' : 'PENDING_EMAIL_VERIFICATION',
  };
}

/** Retrieves organization details with members and audit logs (Owner / Staff only) */
async function getOrganizationDetails(orgId, client = defaultPrisma) {
  return client.organization.findUnique({
    where: { id: orgId },
    include: {
      memberships: {
        include: {
          user: {
            select: { id: true, name: true, email: true, createdAt: true },
          },
        },
      },
      invites: {
        where: { status: 'PENDING' },
      },
      verificationRequests: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
      },
    },
  });
}

/** Submits domain verification proof directly from inside the Owner Portal */
async function submitDomainVerification({ orgId, companyEmail, domain, user }, client = defaultPrisma) {
  const org = await client.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    const err = new Error('Organization not found.');
    err.statusCode = 404;
    throw err;
  }

  const normalizedCompanyEmail = (companyEmail || org.companyEmail).trim().toLowerCase();
  const normalizedDomain = (domain || normalizedCompanyEmail.split('@')[1] || '').trim().toLowerCase();

  // Evaluate verification signals
  const evalResult = evaluateVerificationSignals({
    companyEmail: normalizedCompanyEmail,
    domain: normalizedDomain,
    creatorEmail: user.email,
    orgName: org.name,
  });

  const isVerified = evalResult.isAutoApproved;
  const verificationStatus = evalResult.isAutoApproved ? 'AUTO_APPROVED' : 'NEEDS_MANUAL_REVIEW';

  const result = await client.$transaction(async (tx) => {
    // 1. Update organization domain & badge status
    const updatedOrg = await tx.organization.update({
      where: { id: orgId },
      data: {
        domain: normalizedDomain,
        companyEmail: normalizedCompanyEmail,
        isVerified,
      },
    });

    // 2. Create verification request record
    const verRequest = await tx.verificationRequest.create({
      data: {
        organizationId: orgId,
        status: verificationStatus,
        confidenceScore: evalResult.score,
        autoApproveSignals: JSON.stringify(evalResult.signals),
      },
    });

    return { updatedOrg, verRequest };
  });

  // Log audit trail
  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    tenantId: orgId,
    action: isVerified ? 'ORG_AUTO_APPROVED' : 'VERIFICATION_SUBMITTED',
    targetType: 'ORGANIZATION',
    targetId: orgId,
    metadata: {
      score: evalResult.score,
      isVerified,
      status: verificationStatus,
      signals: evalResult.signals,
    },
  }, client);

  return {
    success: true,
    isVerified,
    verificationStatus,
    confidenceScore: evalResult.score,
    signals: evalResult.signals,
    organization: result.updatedOrg,
  };
}

module.exports = {
  createOrganization,
  getOrganizationDetails,
  evaluateVerificationSignals,
  submitDomainVerification,
};