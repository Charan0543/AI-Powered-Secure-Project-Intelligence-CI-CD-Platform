/**
 * Nexorian Phase 1 Comprehensive Automated Integration Test Suite
 * Tests Auth, Tenant Isolation, Hybrid Org Verification, Single-Use Invites,
 * Explicit RBAC, Backend Docs Protection, and Mandatory Audit Logging.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const prisma = require('../src/db');

describe('Nexorian Phase 1 Integration Tests', () => {
  let founderSessionToken = null;
  let staffSessionToken = null;
  let memberSessionToken = null;
  let clientSessionToken = null;

  let corpOrg = null;
  let startupOrg = null;
  let founderUser = null;
  let staffUser = null;
  let memberUser = null;
  let clientUser = null;

  before(async () => {
    // Clean database before test run
    await prisma.auditLog.deleteMany({});
    await prisma.verificationDecision.deleteMany({});
    await prisma.verificationRequest.deleteMany({});
    await prisma.invite.deleteMany({});
    await prisma.membership.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});

    // Create staff user directly
    const { hashPassword } = require('../src/utils/authCrypto');
    staffUser = await prisma.user.create({
      data: {
        name: 'Nexorian Staff',
        email: 'staff@nexorian.corp',
        passwordHash: hashPassword('StaffPass123!'),
        isEmailVerified: true,
        isNexorianStaff: true,
      },
    });
  });

  // --------------------------------------------------------------------------
  // 1. Authentication & Session Handling Tests
  // --------------------------------------------------------------------------
  describe('1. Authentication & Sessions', () => {
    it('should register a new user and issue a verification OTP', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Founder',
          email: 'alice@enterprise.corp',
          password: 'FounderPassword123!',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'OTP_SENT');

      const user = await prisma.user.findUnique({ where: { email: 'alice@enterprise.corp' } });
      assert.ok(user);
      assert.ok(user.verificationCode);
      assert.equal(user.isEmailVerified, false);
      founderUser = user;
    });

    it('should verify email using valid 6-digit OTP', async () => {
      const user = await prisma.user.findUnique({ where: { id: founderUser.id } });
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'alice@enterprise.corp',
          code: user.verificationCode,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const updated = await prisma.user.findUnique({ where: { id: founderUser.id } });
      assert.equal(updated.isEmailVerified, true);
    });

    it('should authenticate verified user, issue session, and resolve active portal', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@enterprise.corp',
          password: 'FounderPassword123!',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'AUTHENTICATED');
      assert.ok(res.body.sessionToken);
      founderSessionToken = res.body.sessionToken;
    });

    it('should authenticate staff user and direct to /verifier portal', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'staff@nexorian.corp',
          password: 'StaffPass123!',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'AUTHENTICATED');
      assert.equal(res.body.redirectUrl, '/verifier');
      staffSessionToken = res.body.sessionToken;
    });

    it('should retrieve current profile with valid session token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${founderSessionToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.user.email, 'alice@enterprise.corp');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Organization Creation & Hybrid Verification Workflow
  // --------------------------------------------------------------------------
  describe('2. Organization Creation & Hybrid Verification', () => {
    it('should create corporate org with high confidence domain and AUTO_APPROVE trust badge', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .send({
          orgName: 'Enterprise Corp',
          slug: 'enterprise-corp',
          companyEmail: 'admin@enterprise.corp',
          creatorName: 'Alice Founder',
          creatorEmail: 'alice@enterprise.corp',
          creatorPassword: 'FounderPassword123!',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.isVerified, true);
      assert.equal(res.body.data.verificationStatus, 'AUTO_APPROVED');
      assert.equal(res.body.data.membership.role, 'FOUNDER');

      corpOrg = res.body.data.organization;

      // Update founder session with active org
      await prisma.session.updateMany({
        where: { userId: founderUser.id },
        data: { activeOrgId: corpOrg.id },
      });
    });

    it('should create startup org with generic domain in ACTIVE state needing manual review (badge optional)', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .send({
          orgName: 'Early Startup Labs',
          slug: 'early-startup',
          companyEmail: 'team@gmail.com',
          creatorName: 'Bob Startup',
          creatorEmail: 'bob@gmail.com',
          creatorPassword: 'StartupPassword123!',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.isVerified, false); // No badge yet
      assert.equal(res.body.data.verificationStatus, 'NEEDS_MANUAL_REVIEW');
      assert.equal(res.body.data.organization.status, 'ACTIVE'); // Active platform access preserved per Status Policy

      startupOrg = res.body.data.organization;
    });

    it('should reject duplicate organization slug with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .send({
          orgName: 'Duplicate Enterprise',
          slug: 'enterprise-corp',
          companyEmail: 'other@enterprise.corp',
          creatorName: 'Other Founder',
          creatorEmail: 'other@enterprise.corp',
          creatorPassword: 'Password123!',
        });

      assert.equal(res.status, 409);
    });

    it('should allow Founder to run instant in-portal auto-verification with corporate domain', async () => {
      const res = await request(app)
        .post(`/api/organizations/${corpOrg.id}/verify-domain`)
        .set('Authorization', `Bearer ${founderSessionToken}`)
        .set('x-tenant-id', corpOrg.id)
        .send({
          companyEmail: 'founder@enterprise.corp',
          domain: 'enterprise.corp',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.isVerified, true);
      assert.equal(res.body.confidenceScore, 100);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Staff Verifier Dashboard & Manual Review
  // --------------------------------------------------------------------------
  describe('3. Staff Verifier Operations', () => {
    it('should block non-staff from accessing verifier queue with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/verifier/requests')
        .set('Authorization', `Bearer ${founderSessionToken}`);

      assert.equal(res.status, 403);
    });

    it('should allow staff to view verification queue (excluding auto-approved cases by default)', async () => {
      // Default: only pending/manual review cases
      const res = await request(app)
        .get('/api/verifier/requests')
        .set('Authorization', `Bearer ${staffSessionToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 1);
      assert.ok(res.body.every(r => r.status !== 'AUTO_APPROVED'));

      // With status=ALL: includes auto-approved requests
      const resAll = await request(app)
        .get('/api/verifier/requests?status=ALL')
        .set('Authorization', `Bearer ${staffSessionToken}`);

      assert.equal(resAll.status, 200);
      assert.ok(resAll.body.length >= 2);
    });

    it('should allow staff to manually approve trust badge for startup org', async () => {
      const reqRecord = await prisma.verificationRequest.findFirst({
        where: { organizationId: startupOrg.id },
      });
      assert.ok(reqRecord);

      const res = await request(app)
        .post(`/api/verifier/requests/${reqRecord.id}/decision`)
        .set('Authorization', `Bearer ${staffSessionToken}`)
        .send({
          decision: 'APPROVED',
          rationale: 'Verified business registry and founder identification.',
        });

      assert.equal(res.status, 200);

      const updatedOrg = await prisma.organization.findUnique({ where: { id: startupOrg.id } });
      assert.equal(updatedOrg.isVerified, true);
      assert.equal(updatedOrg.status, 'ACTIVE');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Invite-Based Worker & Client Onboarding
  // --------------------------------------------------------------------------
  describe('4. Invite-Based Onboarding', () => {
    let memberInviteToken = null;
    let clientInviteToken = null;
    let revokedInviteId = null;

    it('should allow Founder to create single-use Member and Client invites', async () => {
      // Member invite
      const resMember = await request(app)
        .post('/api/invites')
        .set('Authorization', `Bearer ${founderSessionToken}`)
        .set('x-tenant-id', corpOrg.id)
        .send({
          email: 'worker@enterprise.corp',
          role: 'MEMBER',
        });

      assert.equal(resMember.status, 201);
      assert.ok(resMember.body.token);
      memberInviteToken = resMember.body.token;

      // Client invite
      const resClient = await request(app)
        .post('/api/invites')
        .set('Authorization', `Bearer ${founderSessionToken}`)
        .set('x-tenant-id', corpOrg.id)
        .send({
          email: 'client@partner.corp',
          role: 'CLIENT',
        });

      assert.equal(resClient.status, 201);
      assert.ok(resClient.body.token);
      clientInviteToken = resClient.body.token;
    });

    it('should publicly validate invite token', async () => {
      const res = await request(app).get(`/api/invites/verify/${memberInviteToken}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.role, 'MEMBER');
      assert.equal(res.body.organization.name, 'Enterprise Corp');
    });

    it('should register and accept invite for worker account and invalidate token', async () => {
      // Register worker user
      const { hashPassword } = require('../src/utils/authCrypto');
      memberUser = await prisma.user.create({
        data: {
          name: 'Dan Member',
          email: 'worker@enterprise.corp',
          passwordHash: hashPassword('WorkerPass123!'),
          isEmailVerified: true,
        },
      });

      // Login worker to get session
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'worker@enterprise.corp',
          password: 'WorkerPass123!',
        });
      memberSessionToken = loginRes.body.sessionToken;

      // Accept invite
      const acceptRes = await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${memberSessionToken}`)
        .send({ token: memberInviteToken });

      assert.equal(acceptRes.status, 200);
      assert.equal(acceptRes.body.success, true);
      assert.equal(acceptRes.body.role, 'MEMBER');

      // Verify invite is now marked USED in DB
      const inviteDb = await prisma.invite.findUnique({ where: { token: memberInviteToken } });
      assert.equal(inviteDb.status, 'USED');

      // Verify membership exists
      const membership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: memberUser.id,
            organizationId: corpOrg.id,
          },
        },
      });
      assert.ok(membership);
      assert.equal(membership.role, 'MEMBER');
      assert.equal(membership.status, 'ACTIVE');
    });

    it('should prevent invite replay attack when re-accepting used token', async () => {
      const res = await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${memberSessionToken}`)
        .send({ token: memberInviteToken });

      assert.equal(res.status, 410);
    });

    it('should allow Client invite acceptance and set CLIENT role', async () => {
      const { hashPassword } = require('../src/utils/authCrypto');
      clientUser = await prisma.user.create({
        data: {
          name: 'Claire Client',
          email: 'client@partner.corp',
          passwordHash: hashPassword('ClientPass123!'),
          isEmailVerified: true,
        },
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'client@partner.corp',
          password: 'ClientPass123!',
        });
      clientSessionToken = loginRes.body.sessionToken;

      const acceptRes = await request(app)
        .post('/api/invites/accept')
        .set('Authorization', `Bearer ${clientSessionToken}`)
        .send({ token: clientInviteToken });

      assert.equal(acceptRes.status, 200);
      assert.equal(acceptRes.body.role, 'CLIENT');
    });

    it('should allow Founder to revoke an invite and reject revoked tokens', async () => {
      const newInvite = await request(app)
        .post('/api/invites')
        .set('Authorization', `Bearer ${founderSessionToken}`)
        .set('x-tenant-id', corpOrg.id)
        .send({ email: 'revoked@company.com', role: 'MEMBER' });

      revokedInviteId = newInvite.body.id;
      const revokedToken = newInvite.body.token;

      // Revoke
      const revokeRes = await request(app)
        .post(`/api/invites/${revokedInviteId}/revoke`)
        .set('Authorization', `Bearer ${founderSessionToken}`)
        .set('x-tenant-id', corpOrg.id);

      assert.equal(revokeRes.status, 200);

      // Verify token lookup fails
      const verifyRes = await request(app).get(`/api/invites/verify/${revokedToken}`);
      assert.equal(verifyRes.status, 410);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Tenant Isolation & Server-Side Security Guard Tests
  // --------------------------------------------------------------------------
  describe('5. Strict Tenant Resolution & RBAC', () => {
    it('should block cross-tenant access when user attempts to access an organization they do not belong to', async () => {
      // Member user belongs to corpOrg, but requests startupOrg
      const res = await request(app)
        .get(`/api/organizations/${startupOrg.id}`)
        .set('Authorization', `Bearer ${memberSessionToken}`)
        .set('x-tenant-id', startupOrg.id);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'CROSS_TENANT_FORBIDDEN');
    });

    it('should allow member to access their own organization details', async () => {
      const res = await request(app)
        .get(`/api/organizations/${corpOrg.id}`)
        .set('Authorization', `Bearer ${memberSessionToken}`)
        .set('x-tenant-id', corpOrg.id);

      assert.equal(res.status, 200);
      assert.equal(res.body.organization.id, corpOrg.id);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Backend Raw Docs Protection (Client Exclusion)
  // --------------------------------------------------------------------------
  describe('6. Backend Docs Protection', () => {
    it('should allow MEMBER role to read raw project documentation', async () => {
      const res = await request(app)
        .get('/api/workspace/docs')
        .set('Authorization', `Bearer ${memberSessionToken}`)
        .set('x-tenant-id', corpOrg.id);

      assert.equal(res.status, 200);
      assert.ok(res.body.documents);
      assert.ok(res.body.documents.length > 0);
    });

    it('should strictly deny CLIENT role access to raw documentation with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/workspace/docs')
        .set('Authorization', `Bearer ${clientSessionToken}`)
        .set('x-tenant-id', corpOrg.id);

      assert.equal(res.status, 403);
      assert.equal(res.body.code, 'DOCS_CLIENT_FORBIDDEN');
    });
  });

  // --------------------------------------------------------------------------
  // 7. Mandatory Audit Logging Verification
  // --------------------------------------------------------------------------
  describe('7. Audit Logging Verification', () => {
    it('should have recorded audit log entries for all sensitive lifecycle actions', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { tenantId: corpOrg.id },
      });

      assert.ok(logs.length > 0);

      const actionTypes = new Set(logs.map(l => l.action));
      assert.ok(actionTypes.has('ORG_CREATED'), 'Should have logged ORG_CREATED');
      assert.ok(actionTypes.has('VERIFICATION_SUBMITTED'), 'Should have logged VERIFICATION_SUBMITTED');
      assert.ok(actionTypes.has('ORG_AUTO_APPROVED'), 'Should have logged ORG_AUTO_APPROVED');
      assert.ok(actionTypes.has('INVITE_CREATED'), 'Should have logged INVITE_CREATED');
      assert.ok(actionTypes.has('INVITE_ACCEPTED'), 'Should have logged INVITE_ACCEPTED');
      assert.ok(actionTypes.has('INVITE_REVOKED'), 'Should have logged INVITE_REVOKED');
      assert.ok(actionTypes.has('DOCS_ACCESS_DENIED_CLIENT'), 'Should have logged DOCS_ACCESS_DENIED_CLIENT');
    });

    it('should allow Founder to fetch tenant audit logs via API', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${founderSessionToken}`)
        .set('x-tenant-id', corpOrg.id);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 5);
    });
  });
});
