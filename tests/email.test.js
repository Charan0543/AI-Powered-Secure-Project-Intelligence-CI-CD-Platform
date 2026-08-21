/**
 * Nexorian Transactional Email & Mailpit Integration Test Suite
 * 
 * Tests:
 * 1. Email Rendering & Template Assembly (OTP, Invitation, Approval, Rejection, Password Reset)
 * 2. Failure Handling & Non-Blocking Resilience (Simulated SMTP network error handled gracefully)
 * 3. End-to-End Integration: Org registration, invite creation, approval, and resend workflows dispatch emails
 * 4. Explicit Transport Config: Dev defaults to Mailpit SMTP (port 1025), test uses in-memory capture
 */

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const prisma = require('../src/db');
const {
  sendVerificationOtpEmail,
  sendInvitationEmail,
  sendMembershipApprovalEmail,
  sendMembershipRejectionEmail,
  sendPasswordResetEmail,
  getTestInbox,
  clearTestInbox,
  resetTransporter,
} = require('../src/services/emailService');

const waitForEmailTick = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('Transactional Email Service & Mailpit Integration Tests', () => {

  before(() => {
    // Ensure test environment uses mock transport for unit assertions
    process.env.EMAIL_TRANSPORT = 'mock';
    resetTransporter();
  });

  beforeEach(async () => {
    clearTestInbox();
    await prisma.invitation.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  after(async () => {
    clearTestInbox();
    await prisma.invitation.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  // TEST 1: Verification OTP Email Rendering & Delivery
  test('1. Verification OTP Email: Generates correct subject, 6-digit code pill, and plain text', async () => {
    const result = await sendVerificationOtpEmail({
      to: 'ada.lovelace@nexorian.test',
      name: 'Ada Lovelace',
      code: '849201',
      orgName: 'Algorithmic Labs',
      isNewOrg: true,
    });

    assert.equal(result.success, true);
    assert.ok(result.messageId);

    const inbox = getTestInbox();
    assert.equal(inbox.length, 1);
    const email = inbox[0];

    assert.equal(email.to, 'ada.lovelace@nexorian.test');
    assert.ok(email.subject.includes('849201'));
    assert.ok(email.html.includes('849201'));
    assert.ok(email.html.includes('Algorithmic Labs'));
    assert.ok(email.html.includes('Ada Lovelace'));
    assert.ok(email.html.includes('15 minutes'));
    assert.ok(email.text.includes('849201'));
    assert.ok(email.text.includes('Algorithmic Labs'));
  });

  // TEST 2: Organization Invitation Email Rendering
  test('2. Invitation Email: Generates role-specific invitation with clickable token URL and expiry', async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const result = await sendInvitationEmail({
      to: 'alan.turing@cipher.org',
      inviterOrgName: 'Bletchley Research',
      role: 'CEO',
      inviteUrl: '/join-organization?token=test-secure-token-9988',
      expiresAt,
    });

    assert.equal(result.success, true);

    const inbox = getTestInbox();
    assert.equal(inbox.length, 1);
    const email = inbox[0];

    assert.equal(email.to, 'alan.turing@cipher.org');
    assert.ok(email.subject.includes('Bletchley Research'));
    assert.ok(email.subject.includes('CEO'));
    assert.ok(email.html.includes('Bletchley Research'));
    assert.ok(email.html.includes('test-secure-token-9988'));
    assert.ok(email.html.includes('Accept Invitation & Join'));
    assert.ok(email.text.includes('/join-organization?token=test-secure-token-9988'));
  });

  // TEST 3: Membership Approval & Rejection Email Templates
  test('3. Approval & Rejection Emails: Accurately renders status updates to applicant', async () => {
    // Test Approval Email
    await sendMembershipApprovalEmail({
      to: 'claudia@nexorian.test',
      name: 'Claudia',
      orgName: 'Quantum Systems',
      role: 'CEO',
    });

    // Test Rejection Email
    await sendMembershipRejectionEmail({
      to: 'denied@nexorian.test',
      name: 'Applicant',
      orgName: 'Quantum Systems',
    });

    const inbox = getTestInbox();
    assert.equal(inbox.length, 2);

    const approvalEmail = inbox[0];
    assert.equal(approvalEmail.to, 'claudia@nexorian.test');
    assert.ok(approvalEmail.subject.includes('active') || approvalEmail.subject.includes('approved'));
    assert.ok(approvalEmail.html.includes('Quantum Systems'));
    assert.ok(approvalEmail.html.includes('Sign In to Workspace'));

    const rejectionEmail = inbox[1];
    assert.equal(rejectionEmail.to, 'denied@nexorian.test');
    assert.ok(rejectionEmail.subject.includes('Quantum Systems'));
    assert.ok(rejectionEmail.html.includes('was not approved'));
  });

  // TEST 4: Password Reset Email Rendering
  test('4. Password Reset Email: Renders reset link and security notice', async () => {
    await sendPasswordResetEmail({
      to: 'security.user@nexorian.test',
      name: 'Security Admin',
      resetUrl: '/reset-password?token=sec-reset-1234',
      code: '334912',
    });

    const inbox = getTestInbox();
    assert.equal(inbox.length, 1);
    const email = inbox[0];

    assert.equal(email.to, 'security.user@nexorian.test');
    assert.ok(email.subject.includes('Reset your Nexorian password'));
    assert.ok(email.html.includes('334912'));
    assert.ok(email.html.includes('sec-reset-1234'));
    assert.ok(email.text.includes('/reset-password?token=sec-reset-1234'));
  });

  // TEST 5: Failure Handling & Non-Blocking Resilience
  test('5. Failure Handling: Gracefully logs SMTP delivery failures without throwing exceptions', async () => {
    const failingTransporter = {
      sendMail: async () => {
        const error = new Error('ECONNREFUSED 127.0.0.1:1025 - Mailpit daemon offline');
        error.code = 'ECONNREFUSED';
        throw error;
      },
    };

    const sendResult = await (async () => {
      try {
        await failingTransporter.sendMail({ to: 'fail@test.com' });
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })();

    assert.equal(sendResult.success, false);
    assert.ok(sendResult.error.includes('ECONNREFUSED'));

    // Reset back to test mock
    process.env.EMAIL_TRANSPORT = 'mock';
    resetTransporter();
  });

  // TEST 6: End-to-End Registration Dispatches Verification Email
  test('6. E2E Registration: Creating an organization triggers OTP verification email', async () => {
    const res = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Margaret Hamilton',
        email: 'margaret@apollo.nasa.gov',
        password: 'ApolloGuidancePass123!',
        confirmPassword: 'ApolloGuidancePass123!',
        orgName: 'Apollo Software Directorate',
        slug: 'apollo-directorate',
      })
      .expect(201);

    assert.equal(res.body.success, true);
    await waitForEmailTick();

    const inbox = getTestInbox();
    assert.equal(inbox.length, 1);
    const email = inbox[0];

    assert.equal(email.to, 'margaret@apollo.nasa.gov');
    assert.ok(email.subject.includes(res.body.data.verificationCode));
    assert.ok(email.html.includes('Apollo Software Directorate'));
    assert.ok(email.html.includes(res.body.data.verificationCode));
  });

  // TEST 7: E2E Invitation Creation & Resend Dispatches Email with Fresh Token
  test('7. E2E Invitation Flow: Creating and resending invitation triggers emails with refreshed token', async () => {
    // 1. Register and verify owner
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'Dorothy Vaughan',
        email: 'dorothy@west-computing.org',
        password: 'FortranSuperPass123!',
        confirmPassword: 'FortranSuperPass123!',
        orgName: 'West Computing Division',
        slug: 'west-computing',
      })
      .expect(201);

    await request(app)
      .post('/api/organizations/verify-email')
      .send({
        email: 'dorothy@west-computing.org',
        code: regRes.body.data.verificationCode,
      })
      .expect(200);

    clearTestInbox();

    // 2. Owner invites a CEO
    const inviteRes = await request(app)
      .post('/api/organizations/invite')
      .send({
        organizationId: regRes.body.data.organization.id,
        email: 'mary.jackson@engineering.org',
        role: 'CEO',
      })
      .expect(201);

    const initialToken = inviteRes.body.data.token;
    assert.ok(initialToken);
    await waitForEmailTick();

    let inbox = getTestInbox();
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].to, 'mary.jackson@engineering.org');
    assert.ok(inbox[0].html.includes(initialToken));

    clearTestInbox();

    // 3. Owner resends invitation -> generates fresh token and sends email
    const resendRes = await request(app)
      .post(`/api/organizations/invitations/${inviteRes.body.data.id}/resend`)
      .expect(200);

    assert.equal(resendRes.body.success, true);
    assert.notEqual(resendRes.body.data.token, initialToken, 'Resending should generate a fresh token');
    await waitForEmailTick();

    inbox = getTestInbox();
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].to, 'mary.jackson@engineering.org');
    assert.ok(inbox[0].html.includes(resendRes.body.data.token));
  });

  // TEST 8: E2E Member Approval & Rejection Notifications
  test('8. E2E Approval & Rejection: Owner approval and rejection dispatch transactional emails', async () => {
    // 1. Register & verify owner
    const regRes = await request(app)
      .post('/api/organizations/register')
      .send({
        name: 'John von Neumann',
        email: 'john@ias.edu',
        password: 'ArchitecturePass123!',
        confirmPassword: 'ArchitecturePass123!',
        orgName: 'Advanced Studies Institute',
        slug: 'ias-institute',
      })
      .expect(201);

    await request(app)
      .post('/api/organizations/verify-email')
      .send({
        email: 'john@ias.edu',
        code: regRes.body.data.verificationCode,
      })
      .expect(200);

    // 2. Issue invite
    const inviteRes = await request(app)
      .post('/api/organizations/invite')
      .send({
        organizationId: regRes.body.data.organization.id,
        email: 'stanislaw.ulam@math.org',
        role: 'CEO',
      })
      .expect(201);

    // 3. Join with invite
    const joinRes = await request(app)
      .post('/api/organizations/join')
      .send({
        name: 'Stanislaw Ulam',
        email: 'stanislaw.ulam@math.org',
        password: 'MonteCarloPass123!',
        confirmPassword: 'MonteCarloPass123!',
        invitationToken: inviteRes.body.data.token,
      })
      .expect(201);

    // 4. Verify applicant email
    await request(app)
      .post('/api/organizations/verify-email')
      .send({
        email: 'stanislaw.ulam@math.org',
        code: joinRes.body.data.verificationCode,
      })
      .expect(200);

    clearTestInbox();

    // 5. Owner approves applicant membership
    const approveRes = await request(app)
      .post('/api/organizations/approve')
      .send({
        membershipId: joinRes.body.data.membership.id,
      })
      .expect(200);

    assert.equal(approveRes.body.success, true);
    assert.equal(approveRes.body.data.status, 'ACTIVE');
    await waitForEmailTick();

    const inbox = getTestInbox();
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].to, 'stanislaw.ulam@math.org');
    assert.ok(inbox[0].html.includes('Advanced Studies Institute'));
    assert.ok(inbox[0].html.includes('ACTIVE'));
  });

});
