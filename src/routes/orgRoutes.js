const express = require('express');
const { createOrganization, getOrganizationDetails, submitDomainVerification } = require('../services/orgService');
const { verifyEmailOtp } = require('../services/authService');
const { requireAuth } = require('../middleware/authGuard');
const { requireTenant } = require('../middleware/tenantGuard');
const { requireRole } = require('../middleware/rbacGuard');
const defaultPrisma = require('../db');
const crypto = require('crypto');
const { logAuditEvent } = require('../utils/auditLogger');
const { generateVerificationCode } = require('../utils/authCrypto');
const { sendVerificationOtpEmail } = require('../services/emailService');

const router = express.Router();

// Organization Registration Handler
async function handleCreateOrg(req, res) {
  try {
    const body = req.body || {};
    const orgName = body.orgName || body.name;
    const slug = body.slug;
    const companyEmail = body.companyEmail || body.orgEmailOrGithub || body.email;
    const creatorName = body.creatorName || body.name;
    const creatorEmail = body.creatorEmail || body.email;
    const creatorPassword = body.creatorPassword || body.password;

    if (!orgName || !slug || !companyEmail || !creatorName || !creatorEmail || !creatorPassword) {
      return res.status(400).json({
        error: 'Organization name, slug, company email, creator name, email, and password are required.',
        details: {
          orgName: !orgName ? 'Organization name is required.' : undefined,
          slug: !slug ? 'Organization slug is required.' : undefined,
          email: !creatorEmail ? 'Email is required.' : undefined,
          password: !creatorPassword ? 'Password is required.' : undefined,
        },
      });
    }

    const result = await createOrganization({
      orgName,
      slug,
      companyEmail,
      creatorName,
      creatorEmail,
      creatorPassword,
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully. Verification code sent.',
      data: {
        organization: result.organization,
        user: result.user,
        membership: result.membership,
        verificationRequest: result.verificationRequest,
        isVerified: result.isVerified,
        verificationStatus: result.verificationStatus,
        verificationCode: result.user ? undefined : undefined,
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      field: err.field,
      details: err.field ? { [err.field]: err.message } : undefined,
    });
  }
}

router.post('/', handleCreateOrg);
router.post('/register', handleCreateOrg);

// Helper to verify OTP and issue a session immediately for seamless portal entry
async function handleVerifyEmailOtp(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }
    const result = await verifyEmailOtp({ email, code });
    const user = result.user;

    // Find primary membership and organization for user
    const membership = await defaultPrisma.membership.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { organization: true },
    });

    // Issue active session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const session = await defaultPrisma.session.create({
      data: {
        token,
        userId: user.id,
        activeOrgId: membership ? membership.organizationId : null,
        expiresAt,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Welcome to your workspace!',
      sessionToken: token,
      data: {
        sessionToken: token,
        user: { id: user.id, name: user.name, email: user.email },
        organization: membership ? membership.organization : null,
        role: membership ? membership.role : 'FOUNDER',
      },
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

router.post('/verify-email', handleVerifyEmailOtp);
router.post('/verify-otp', handleVerifyEmailOtp);

// Resend OTP endpoint
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const normalizedEmail = email.trim().toLowerCase();
    const user = await defaultPrisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(404).json({ error: 'User account not found.' });

    const newCode = generateVerificationCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await defaultPrisma.user.update({
      where: { id: user.id },
      data: { verificationCode: newCode, verificationCodeExpires: expires },
    });

    await sendVerificationOtpEmail(normalizedEmail, newCode, user.name).catch(() => {});
    res.status(200).json({ success: true, message: 'Verification code resent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend code.' });
  }
});

// Submit Domain Verification (Founder / Org Owner inside Owner Portal)
router.post('/:orgId/verify-domain', requireAuth, requireTenant, requireRole(['FOUNDER', 'ORG_OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { companyEmail, domain } = req.body;
    const result = await submitDomainVerification({
      orgId: req.tenant.id,
      companyEmail,
      domain,
      user: req.user,
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Organization Details (Tenant Scoped & Guarded)
router.get('/:orgId', requireAuth, requireTenant, async (req, res) => {
  try {
    const org = await getOrganizationDetails(req.tenant.id);
    res.status(200).json({
      organization: org,
      callerRole: req.membership.role,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve organization details.' });
  }
});

// Organization Members (Owner / Admin / Member)
router.get('/:orgId/members', requireAuth, requireTenant, async (req, res) => {
  try {
    const members = await defaultPrisma.membership.findMany({
      where: { organizationId: req.tenant.id, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
      },
    });
    res.status(200).json(members);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve members.' });
  }
});

// Update Member Role (Founder / Org Owner only)
router.patch('/:orgId/members/:memberId/role', requireAuth, requireTenant, requireRole(['FOUNDER', 'ORG_OWNER']), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['ADMIN', 'MEMBER', 'CLIENT', 'ORG_OWNER'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const targetMembership = await defaultPrisma.membership.findUnique({
      where: { id: req.params.memberId },
    });

    if (!targetMembership || targetMembership.organizationId !== req.tenant.id) {
      return res.status(404).json({ error: 'Member not found in this organization.' });
    }

    const updated = await defaultPrisma.membership.update({
      where: { id: req.params.memberId },
      data: { role },
    });

    await logAuditEvent({
      actorId: req.user.id,
      actorEmail: req.user.email,
      tenantId: req.tenant.id,
      action: 'ROLE_CHANGED',
      targetType: 'MEMBERSHIP',
      targetId: req.params.memberId,
      metadata: { newRole: role, previousRole: targetMembership.role },
    });

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

module.exports = router;