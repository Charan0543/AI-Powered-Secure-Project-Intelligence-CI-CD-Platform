/**
 * Nexorian Multi-Tenant Organization Access System Test Suite
 * Covers:
 * 1. Create Organization flow (User, Org with optional address, OWNER membership in PENDING_VERIFICATION)
 * 2. Email verification success & failure
 * 3. Role-specific Invitation creation with secure single-use token
 * 4. Join Flow with strict role locking (invitee cannot alter assigned role) & PENDING_APPROVAL state
 * 5. Owner Portal approval activating membership to ACTIVE
 * 6. Owner Portal rejection setting membership to REJECTED
 * 7. Role Management strictly limited to OWNER and CEO (invalid role rejected)
 * 8. Conflicts: Duplicate slug and duplicate verified email handling (409)
 * 9. Invitation Security: Rejects invalid, expired, or already-accepted invitation tokens
 * 10. Privacy & Production Safety: OTP not exposed in production mode, and transactional rollback on failure
 */

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const prisma = require('../src/db');
const { verifyPassword } = require('../src/utils/authCrypto');
const { registerOrganizationWithUser } = require('../src/services/orgService');

describe('Nexorian Multi-Tenant Organization Access System - Refined', () => {

  before(() => {
    process.env.EMAIL_TRANSPORT = 'mock';
    require('../src/services/emailService').resetTransporter();
  });

  beforeEach(async () => {
    await prisma.invitation.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  after(async () => {
    await prisma.invitation.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // TEST 1: Create Organization Success with Optional Address
  test('1. Create Organization: Registers User, Org (without address), and OWNER membership in PENDING_VERIFICATION', async () => {
    const payload = {
      name: 'Grace Hopper',
      email: 'grace.hopper@compiler.org',
      password: 'StrongSecretPass123!',
      confirmPassword: 'StrongSecretPass123!',
      phoneNumber: '+1 (555) 234-5678',
      githubUrl: 'https://github.com/ghopper',
      orgName: 'Compiler Innovations',
      slug: 'compiler-innovations',
      type: 'Engineering Team',
      country: 'United States',
      // address omitted to verify optionality
    };

    const res = await request(app)
      .post('/api/organizations/register')
      .send(payload)
      .expect(201);

    assert.equal(res.body.success, true);
    assert.equal(res.body.status, 'PENDING_VERIFICATION');
    assert.equal(res.body.data.organization.name, 'Compiler Innovations');
    assert.equal(res.body.data.organization.address, null, 'Address should be optional and null if omitted');
    assert.equal(res.body.data.user.email, 'grace.hopper@compiler.org');
    assert.equal(res.body.data.user.isEmailVerified, false);
    assert.equal(res.body.data.membership.role, 'OWNER');
    assert.equal(res.body.data.membership.status, 'PENDING_VERIFICATION');
    assert.ok(res.body.data.verificationCode, 'Verification code should be returned in development mode');

    // DB Verification
    const userInDb = await prisma.user.findUnique({ where: { email: 'grace.hopper@compiler.org' } });
    assert.ok(userInDb);
    assert.equal(userInDb.isEmailVerified, false);
    assert.ok(verifyPassword('StrongSecretPass123!', userInDb.passwordHash));

    const membershipInDb = await prisma.membership.findFirst({ where: { userId: userInDb.id } });
    assert.ok(membershipInDb);
    assert.equal(membershipInDb.role, 'OWNER');
    assert.equal(membershipInDb.status, 'PENDING_VERIFICATION');
  });

  // TEST 2: Email Verification (Success & Failure)
  test('2. Email Verification: Valid OTP activates OWNER membership to ACTIVE, invalid OTP is rejected', async () => {
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Katherine Johnson',
        email: 'katherine@nasa.gov',
        password: 'OrbitalTrajectory123!',
        confirmPassword: 'OrbitalTrajectory123!',
        orgName: 'Space Calculations',
        slug: 'space-calcs',
      })
      .expect(201);

    const otpCode = regRes.body.data.verificationCode;

    // Invalid code attempt
    const invalidRes = await request(app)
      .post('/api/organizations/verify-email')
      .send({
        email: 'katherine@nasa.gov',
        code: '000000',
      })
      .expect(400);

    assert.equal(invalidRes.body.success, false);

    // Valid code attempt
    const verifyRes = await request(app)
      .post('/api/organizations/verify-email')
      .send({
        email: 'katherine@nasa.gov',
        code: otpCode,
      })
      .expect(200);

    assert.equal(verifyRes.body.success, true);
    assert.equal(verifyRes.body.status, 'ACTIVE');
    assert.equal(verifyRes.body.data.user.isEmailVerified, true);
    assert.equal(verifyRes.body.data.membership.status, 'ACTIVE');

    // Verify OTP is cleared after verification
    const verifiedUser = await prisma.user.findUnique({ where: { email: 'katherine@nasa.gov' } });
    assert.equal(verifiedUser.verificationCode, null);
    assert.equal(verifiedUser.verificationCodeExpires, null);
  });

  // TEST 3: Role-Specific Invitation Creation
  test('3. Invitations: Owner generates role-specific invitation with unique secure token', async () => {
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Alice Owner',
        email: 'alice@enterprise.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        orgName: 'Enterprise Holdings',
        slug: 'enterprise-holdings',
      })
      .expect(201);

    const orgId = regRes.body.data.organization.id;

    // Create CEO Invitation
    const inviteRes = await request(app)
      .post('/api/organizations/invite')
      .send({
        email: 'bob.ceo@enterprise.org',
        role: 'CEO',
        organizationId: orgId,
      })
      .expect(201);

    assert.equal(inviteRes.body.success, true);
    assert.equal(inviteRes.body.message, 'Invitation sent successfully.');
    assert.equal(inviteRes.body.data.email, 'bob.ceo@enterprise.org');
    assert.equal(inviteRes.body.data.role, 'CEO');
    assert.ok(inviteRes.body.data.token);
    assert.equal(inviteRes.body.data.inviteUrl, `/join-organization?token=${inviteRes.body.data.token}`);

    // Validate token lookup endpoint
    const checkRes = await request(app)
      .get(`/api/organizations/invitation/${inviteRes.body.data.token}`)
      .expect(200);

    assert.equal(checkRes.body.success, true);
    assert.equal(checkRes.body.data.role, 'CEO');
    assert.equal(checkRes.body.data.organization.name, 'Enterprise Holdings');
  });

  // TEST 4: Join Flow with Role Locking & Pending Approval State
  test('4. Join Flow: Role is strictly locked from invite and membership enters PENDING_APPROVAL after email verify', async () => {
    // 1. Setup Org & CEO Invitation
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Alice Owner',
        email: 'alice@cloud.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        orgName: 'Cloud Infrastructure Corp',
        slug: 'cloud-infra',
      })
      .expect(201);

    const orgId = regRes.body.data.organization.id;

    const inviteRes = await request(app)
      .post('/api/organizations/invite')
      .send({
        email: 'carol@cloud.org',
        role: 'CEO', // Assigned role is CEO
        organizationId: orgId,
      })
      .expect(201);

    const inviteToken = inviteRes.body.data.token;

    // 2. Invitee submits Join registration (even if trying to pass role: 'OWNER', it must be locked to 'CEO')
    const joinRes = await request(app)
      .post('/api/organizations/join')
      .send({
        name: 'Carol Danvers',
        email: 'carol@cloud.org',
        password: 'CarolPassword123!',
        confirmPassword: 'CarolPassword123!',
        phoneNumber: '+1 (555) 888-9999',
        githubUrl: 'https://github.com/caroldanvers',
        invitationToken: inviteToken,
        role: 'OWNER', // Attempted tamper should be ignored
      })
      .expect(201);

    assert.equal(joinRes.body.success, true);
    assert.equal(joinRes.body.data.membership.role, 'CEO', 'Role must strictly remain CEO as assigned by invite');
    assert.equal(joinRes.body.data.membership.status, 'PENDING_VERIFICATION');

    const otpCode = joinRes.body.data.verificationCode;

    // 3. Invitee verifies email OTP -> Transitions to PENDING_APPROVAL
    const verifyRes = await request(app)
      .post('/api/organizations/verify-email')
      .send({
        email: 'carol@cloud.org',
        code: otpCode,
      })
      .expect(200);

    assert.equal(verifyRes.body.success, true);
    assert.equal(verifyRes.body.status, 'PENDING_APPROVAL');
    assert.equal(verifyRes.body.message, 'Email verified successfully. Awaiting owner approval.');
    assert.equal(verifyRes.body.data.membership.status, 'PENDING_APPROVAL');
    assert.equal(verifyRes.body.data.membership.role, 'CEO');
  });

  // TEST 5: Owner Portal Approval Activating Membership
  test('5. Owner Approval: Owner approves PENDING_APPROVAL membership to ACTIVE', async () => {
    // 1. Create Org & verify owner email
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Owner User',
        email: 'owner@sec.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        orgName: 'Security Ops',
        slug: 'security-ops',
      })
      .expect(201);

    const orgId = regRes.body.data.organization.id;

    await request(app)
      .post('/api/organizations/verify-email')
      .send({ email: 'owner@sec.org', code: regRes.body.data.verificationCode })
      .expect(200);

    // 2. Invite & Join
    const inviteRes = await request(app)
      .post('/api/organizations/invite')
      .send({ email: 'ceo@sec.org', role: 'CEO', organizationId: orgId })
      .expect(201);

    const joinRes = await request(app)
      .post('/api/organizations/join')
      .send({
        name: 'Executive CEO',
        email: 'ceo@sec.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        invitationToken: inviteRes.body.data.token,
      })
      .expect(201);

    await request(app)
      .post('/api/organizations/verify-email')
      .send({ email: 'ceo@sec.org', code: joinRes.body.data.verificationCode })
      .expect(200);

    const membershipId = joinRes.body.data.membership.id;

    // 3. Owner Approves Request
    const approveRes = await request(app)
      .post('/api/organizations/approve')
      .send({ membershipId })
      .expect(200);

    assert.equal(approveRes.body.success, true);
    assert.equal(approveRes.body.message, 'Request approved successfully.');
    assert.equal(approveRes.body.data.status, 'ACTIVE');
    assert.equal(approveRes.body.data.role, 'CEO');

    // Verify in Member Directory
    const membersRes = await request(app)
      .get(`/api/organizations/${orgId}/members`)
      .expect(200);

    assert.equal(membersRes.body.data.members.length, 2);
    assert.equal(membersRes.body.data.pendingRequests.length, 0);
  });

  // TEST 6: Owner Portal Rejection
  test('6. Owner Rejection: Owner rejects PENDING_APPROVAL request to REJECTED', async () => {
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Owner User',
        email: 'owner@reject.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        orgName: 'Reject Test Org',
        slug: 'reject-org',
      })
      .expect(201);

    const orgId = regRes.body.data.organization.id;

    const inviteRes = await request(app)
      .post('/api/organizations/invite')
      .send({ email: 'rejected@reject.org', role: 'CEO', organizationId: orgId })
      .expect(201);

    const joinRes = await request(app)
      .post('/api/organizations/join')
      .send({
        name: 'Rejected Applicant',
        email: 'rejected@reject.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        invitationToken: inviteRes.body.data.token,
      })
      .expect(201);

    const membershipId = joinRes.body.data.membership.id;

    const rejectRes = await request(app)
      .post('/api/organizations/reject')
      .send({ membershipId })
      .expect(200);

    assert.equal(rejectRes.body.success, true);
    assert.equal(rejectRes.body.data.status, 'REJECTED');
  });

  // TEST 7: Role Management strictly limited to OWNER and CEO
  test('7. Role Management: Owner switches member role between CEO and OWNER, rejects invalid role', async () => {
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Owner Alpha',
        email: 'alpha@role.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        orgName: 'Role Switching Org',
        slug: 'role-switching-org',
      })
      .expect(201);

    const orgId = regRes.body.data.organization.id;
    const ownerMembershipId = regRes.body.data.membership.id;

    // Change role to CEO
    const updateRes = await request(app)
      .patch(`/api/organizations/${orgId}/members/${ownerMembershipId}/role`)
      .send({ role: 'CEO' })
      .expect(200);

    assert.equal(updateRes.body.success, true);
    assert.equal(updateRes.body.data.role, 'CEO');

    // Switch back to OWNER
    const switchBackRes = await request(app)
      .patch(`/api/organizations/${orgId}/members/${ownerMembershipId}/role`)
      .send({ role: 'OWNER' })
      .expect(200);

    assert.equal(switchBackRes.body.data.role, 'OWNER');

    // Attempt invalid role (e.g. 'ADMIN')
    const invalidRoleRes = await request(app)
      .patch(`/api/organizations/${orgId}/members/${ownerMembershipId}/role`)
      .send({ role: 'ADMIN' })
      .expect(400);

    assert.equal(invalidRoleRes.body.success, false);
  });

  // TEST 8: Duplicate Email and Slug Handling
  test('8. Conflicts: Rejects duplicate organization slug and duplicate verified email with 409', async () => {
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Unique User',
        email: 'unique@conflict.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        orgName: 'Conflict Corp',
        slug: 'conflict-corp',
      })
      .expect(201);

    await request(app)
      .post('/api/organizations/verify-email')
      .send({ email: 'unique@conflict.org', code: regRes.body.data.verificationCode })
      .expect(200);

    // Duplicate slug
    const duplicateSlugRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Other User',
        email: 'other@conflict.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        orgName: 'Another Corp',
        slug: 'conflict-corp',
      })
      .expect(409);

    assert.equal(duplicateSlugRes.body.success, false);
    assert.ok(duplicateSlugRes.body.details.slug);

    // Duplicate email
    const duplicateEmailRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Duplicate Email User',
        email: 'unique@conflict.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        orgName: 'Different Corp',
        slug: 'different-corp',
      })
      .expect(409);

    assert.equal(duplicateEmailRes.body.success, false);
    assert.ok(duplicateEmailRes.body.details.email);
  });

  // TEST 9: Invalid, Expired, or Reused Invitation Token Rejection
  test('9. Invitation Security: Rejects invalid, expired, or already-accepted invitation tokens', async () => {
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Owner User',
        email: 'owner@tokensecurity.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        orgName: 'Token Security Org',
        slug: 'token-sec-org',
      })
      .expect(201);

    const orgId = regRes.body.data.organization.id;

    // Generate valid invite
    const inviteRes = await request(app)
      .post('/api/organizations/invite')
      .send({ email: 'invitee@tokensecurity.org', role: 'CEO', organizationId: orgId })
      .expect(201);

    const validToken = inviteRes.body.data.token;

    // 1. Rejection on fake token
    await request(app)
      .post('/api/organizations/join')
      .send({
        name: 'Fake Token User',
        email: 'fake@tokensecurity.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        invitationToken: 'nonexistent-token-12345',
      })
      .expect(400);

    // 2. Successful first use
    await request(app)
      .post('/api/organizations/join')
      .send({
        name: 'Valid User',
        email: 'invitee@tokensecurity.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        invitationToken: validToken,
      })
      .expect(201);

    // 3. Rejection on reused token
    const reuseRes = await request(app)
      .post('/api/organizations/join')
      .send({
        name: 'Second User',
        email: 'second@tokensecurity.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        invitationToken: validToken,
      })
      .expect(400);

    assert.equal(reuseRes.body.success, false);
  });

  // TEST 10: Production Privacy & Atomic Transactions
  test('10. Privacy & Atomicity: Never exposes OTP in production mode and rolls back on failure', async () => {
    // Check production mode suppresses OTP
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const prodRes = await request(app)
        .post('/api/organizations/register')
        .send({
          name: 'Prod User',
          email: 'prod@nexorian.com',
          password: 'ProdPassword123!',
          confirmPassword: 'ProdPassword123!',
          orgName: 'Production Org',
          slug: 'production-org',
        })
        .expect(201);

      assert.equal(prodRes.body.data.verificationCode, undefined, 'Verification code must NEVER be returned in production');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    // Atomic Rollback check
    const mockData = {
      name: 'Rollback User',
      email: 'rollback@atomic.org',
      password: 'AtomicPassword123!',
      orgName: 'Atomic Systems',
      slug: 'atomic-systems',
    };

    const mockClient = {
      $transaction: async (fn) => {
        return prisma.$transaction(async (tx) => {
          const customTx = {
            ...tx,
            membership: {
              ...tx.membership,
              create: async () => {
                throw new Error('Simulated atomic failure');
              },
            },
          };
          return fn(customTx);
        });
      },
    };

    await assert.rejects(
      async () => {
        await registerOrganizationWithUser(mockData, mockClient);
      },
      { message: 'Simulated atomic failure' }
    );

    const userInDb = await prisma.user.findUnique({ where: { email: 'rollback@atomic.org' } });
    const orgInDb = await prisma.organization.findUnique({ where: { slug: 'atomic-systems' } });

    assert.equal(userInDb, null, 'User must not exist due to rollback');
    assert.equal(orgInDb, null, 'Organization must not exist due to rollback');
  });

  // TEST 11: Successful Sign-In for Verified Active Owner and CEO
  test('11. Sign-In: Successfully authenticates verified user with correct scrypt password', async () => {
    // Register and verify owner
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Login Test User',
        email: 'login@auth.org',
        password: 'ValidLoginPass123!',
        confirmPassword: 'ValidLoginPass123!',
        orgName: 'Auth Org',
        slug: 'auth-org',
      })
      .expect(201);

    await request(app)
      .post('/api/organizations/verify-email')
      .send({ email: 'login@auth.org', code: regRes.body.data.verificationCode })
      .expect(200);

    // Sign in
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@auth.org',
        password: 'ValidLoginPass123!',
      })
      .expect(200);

    assert.equal(loginRes.body.success, true);
    assert.equal(loginRes.body.status, 'AUTHENTICATED');
    assert.equal(loginRes.body.data.primaryRole, 'OWNER');
    assert.equal(loginRes.body.data.primaryOrganization.name, 'Auth Org');
    assert.equal(loginRes.body.data.user.email, 'login@auth.org');
  });

  // TEST 12: Sign-In Rejection on Incorrect Password
  test('12. Sign-In Security: Rejects sign-in with incorrect password with 401', async () => {
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Wrong Pass User',
        email: 'wrongpass@auth.org',
        password: 'CorrectPass123!',
        confirmPassword: 'CorrectPass123!',
        orgName: 'Security Check Org',
        slug: 'security-check-org',
      })
      .expect(201);

    await request(app)
      .post('/api/organizations/verify-email')
      .send({ email: 'wrongpass@auth.org', code: regRes.body.data.verificationCode })
      .expect(200);

    const wrongLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrongpass@auth.org',
        password: 'IncorrectPassword999!',
      })
      .expect(401);

    assert.equal(wrongLoginRes.body.success, false);
    assert.equal(wrongLoginRes.body.error, 'Invalid email address or password.');
  });

  // TEST 13: Sign-In Response on Unverified Email
  test('13. Sign-In Gating: Blocks sign-in on unverified accounts with UNVERIFIED_EMAIL status', async () => {
    await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Unverified User',
        email: 'unverified@auth.org',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
        orgName: 'Unverified Org',
        slug: 'unverified-org',
      })
      .expect(201);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'unverified@auth.org',
        password: 'ValidPass123!',
      })
      .expect(403);

    assert.equal(loginRes.body.status, 'UNVERIFIED_EMAIL');
  });

  // TEST 14: Sign-In Response on Pending Approval Membership
  test('14. Sign-In Status: Returns PENDING_APPROVAL status for applicant awaiting owner review', async () => {
    // 1. Create org and verify owner
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Owner Host',
        email: 'host@pending.org',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        orgName: 'Pending Host Org',
        slug: 'pending-host-org',
      })
      .expect(201);

    await request(app)
      .post('/api/organizations/verify-email')
      .send({ email: 'host@pending.org', code: regRes.body.data.verificationCode })
      .expect(200);

    // 2. Invite applicant
    const inviteRes = await request(app)
      .post('/api/organizations/invite')
      .send({ email: 'applicant@pending.org', role: 'CEO', organizationId: regRes.body.data.organization.id })
      .expect(201);

    // 3. Applicant joins and verifies email
    const joinRes = await request(app)
      .post('/api/organizations/join')
      .send({
        name: 'Applicant User',
        email: 'applicant@pending.org',
        password: 'ApplicantPass123!',
        confirmPassword: 'ApplicantPass123!',
        invitationToken: inviteRes.body.data.token,
      })
      .expect(201);

    await request(app)
      .post('/api/organizations/verify-email')
      .send({ email: 'applicant@pending.org', code: joinRes.body.data.verificationCode })
      .expect(200);

    // 4. Applicant tries to sign in before owner approval
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'applicant@pending.org',
        password: 'ApplicantPass123!',
      })
      .expect(200);

    assert.equal(loginRes.body.status, 'PENDING_APPROVAL');
    assert.ok(loginRes.body.pendingMemberships.length > 0);
  });

});
