/**
 * Nexorian Transactional Email Service
 * 
 * Explicit Transport Management:
 * - Development: Directs all outgoing emails to local Mailpit SMTP server (localhost:1025)
 *                Captures emails in Mailpit Web UI (http://localhost:8025) without sending to real inboxes.
 * - Test:        Supports in-memory capture and mock transport for rapid automated testing.
 * - Production:  Uses authenticated production SMTP credentials configured via environment variables.
 * 
 * Reliability Guarantee:
 * Email sending is non-blocking with isolated error handling and structured logging.
 * Delivery issues will never disrupt or rollback database transactions.
 */

const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

// Global in-memory inbox for unit testing
const testInbox = [];

/**
 * Resolves the appropriate nodemailer transporter based on explicit environment config
 */
function createTransporter() {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // 1. Explicit Test Mode Transport (when running test suites without active Mailpit)
  if (process.env.EMAIL_TRANSPORT === 'mock' || (nodeEnv === 'test' && process.env.EMAIL_TRANSPORT !== 'smtp')) {
    return {
      isMock: true,
      sendMail: async (mailOptions) => {
        testInbox.push({
          ...mailOptions,
          sentAt: new Date(),
          messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        });
        return {
          messageId: `mock-${Date.now()}`,
          response: '250 Mock email accepted',
        };
      },
    };
  }

  // 2. Production Transport (Authenticated SMTP)
  if (nodeEnv === 'production') {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost) {
      logger.warn('SMTP_HOST is not configured in production mode. Emails will fail to send.');
    }

    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });
  }

  // 3. Development Mode Transport (Mailpit Local SMTP by default)
  const devHost = process.env.SMTP_HOST || 'localhost';
  const devPort = parseInt(process.env.SMTP_PORT || '1025', 10);

  return nodemailer.createTransport({
    host: devHost,
    port: devPort,
    secure: false,
    ignoreTLS: true,
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 4000,
  });
}

// Cached transporter instance
let transporterInstance = createTransporter();

/**
 * Resets or reconfigures the transporter (useful for testing or config reload)
 */
function resetTransporter() {
  transporterInstance = createTransporter();
  return transporterInstance;
}

/**
 * Clears the test inbox
 */
function clearTestInbox() {
  testInbox.length = 0;
}

/**
 * Retrieves the test inbox contents
 */
function getTestInbox() {
  return [...testInbox];
}

/**
 * Safe email delivery wrapper that logs errors without throwing exceptions
 * @param {object} mailOptions Standard nodemailer options (to, subject, html, text, from)
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
async function sendEmailSafely(mailOptions) {
  const from = mailOptions.from || process.env.EMAIL_FROM || 'Nexorian Security <security@nexorian.internal>';
  const finalOptions = { ...mailOptions, from };

  try {
    const result = await transporterInstance.sendMail(finalOptions);
    logger.info('Transactional email dispatched', {
      to: finalOptions.to,
      subject: finalOptions.subject,
      messageId: result.messageId,
      transport: process.env.NODE_ENV === 'production' ? 'production-smtp' : (transporterInstance.isMock ? 'test-mock' : 'mailpit-smtp'),
    });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error('Failed to deliver transactional email via SMTP', {
      to: finalOptions.to,
      subject: finalOptions.subject,
      error: error.message,
      code: error.code,
      smtpHost: process.env.SMTP_HOST || 'localhost',
      smtpPort: process.env.SMTP_PORT || '1025',
      hint: process.env.NODE_ENV !== 'production' ? 'Ensure Mailpit is running on port 1025 (run `npm run mailpit`)' : 'Check production SMTP credentials',
    });
    return { success: false, error: error.message };
  }
}

/**
 * Generates modern, clean, branded HTML email template for Nexorian
 */
function buildEmailTemplate({ title, badge, contentHtml, ctaText, ctaUrl, footerNote }) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const ctaFullUrl = ctaUrl ? (ctaUrl.startsWith('http') ? ctaUrl : `${appUrl}${ctaUrl}`) : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      color: #0F172A;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F8FAFC;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      padding: 24px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo-text {
      color: #FFFFFF;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background-color: rgba(37, 99, 235, 0.2);
      border: 1px solid rgba(96, 165, 250, 0.4);
      color: #93C5FD;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .body {
      padding: 36px 32px 28px;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 16px;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 20px;
    }
    .otp-card {
      background-color: #EFF6FF;
      border: 1.5px solid #BFDBFE;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 700;
      color: #1D4ED8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #1E3A8A;
      margin: 4px 0;
    }
    .otp-note {
      font-size: 12px;
      color: #64748B;
      margin-top: 8px;
    }
    .cta-container {
      margin: 28px 0;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%);
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 12px 28px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    .details-box {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px 18px;
      margin: 20px 0;
      font-size: 13px;
      color: #334155;
    }
    .footer {
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.5;
    }
    .footer-security {
      color: #64748B;
      font-weight: 600;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo-text">🛡️ Nexorian</span>
        ${badge ? `<span class="badge">${badge}</span>` : ''}
      </div>
      <div class="body">
        <h1 class="title">${title}</h1>
        ${contentHtml}
        ${ctaFullUrl && ctaText ? `
        <div class="cta-container">
          <a href="${ctaFullUrl}" class="cta-button" target="_blank" rel="noopener noreferrer">${ctaText}</a>
        </div>
        ` : ''}
      </div>
      <div class="footer">
        <div class="footer-security">Nexorian Security & Identity System</div>
        <div>${footerNote || 'This is an automated transactional security message. If you did not initiate this request, you can safely ignore this email.'}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Sends OTP Email for User Registration & Organization Verification
 */
async function sendVerificationOtpEmail({ to, name, code, orgName, isNewOrg = true }) {
  const title = isNewOrg ? 'Verify Your Organization Account' : 'Verify Your Email Address';
  const actionDescription = isNewOrg
    ? `You recently created the organization <strong>${orgName || 'your organization'}</strong> on Nexorian.`
    : `You are completing your account registration for <strong>${orgName || 'Nexorian'}</strong>.`;

  const html = buildEmailTemplate({
    title,
    badge: 'SECURITY VERIFICATION',
    contentHtml: `
      <p class="text">Hello ${name || 'there'},</p>
      <p class="text">${actionDescription} Please use the 6-digit verification code below to complete your verification.</p>
      <div class="otp-card">
        <div class="otp-label">Verification Code (Valid for 15 minutes)</div>
        <div class="otp-code">${code}</div>
        <div class="otp-note">Enter this code on the verification screen to activate your account.</div>
      </div>
      <p class="text" style="font-size: 13px; color: #64748B;">For your security, never share this code with anyone. Nexorian staff will never ask for your verification code.</p>
    `,
    footerNote: 'This verification code will expire in 15 minutes.',
  });

  const text = `Hello ${name || 'there'},

${isNewOrg ? `You recently created the organization "${orgName}" on Nexorian.` : 'You are completing your registration on Nexorian.'}

Your 6-digit verification code is: ${code}

This code is valid for 15 minutes. Enter it on the verification screen to activate your account.

If you did not request this, you can safely ignore this email.

Nexorian Security & Identity System`;

  return await sendEmailSafely({
    to,
    subject: `Your Nexorian Verification Code: ${code}`,
    html,
    text,
  });
}

/**
 * 2. Sends Role-Specific Organization Invitation Email
 */
async function sendInvitationEmail({ to, inviterOrgName, role, inviteUrl, expiresAt }) {
  const expiryFormatted = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) : '7 days';

  const roleTitle = role === 'OWNER' ? 'Organization Owner (Full Admin)' : 'CEO / Organization Executive';

  const html = buildEmailTemplate({
    title: `You've been invited to join ${inviterOrgName}`,
    badge: 'ORGANIZATION INVITATION',
    contentHtml: `
      <p class="text">You have been invited to join <strong>${inviterOrgName}</strong> on Nexorian as a permission-governed team member.</p>
      <div class="details-box">
        <strong>Assigned Role:</strong> ${roleTitle}<br>
        <strong>Target Organization:</strong> ${inviterOrgName}<br>
        <strong>Invitation Valid Until:</strong> ${expiryFormatted}
      </div>
      <p class="text">Click the button below to accept your invitation, create your password, and access your organization's secure workspace.</p>
    `,
    ctaText: 'Accept Invitation & Join',
    ctaUrl: inviteUrl,
    footerNote: `This invitation link is single-use and valid until ${expiryFormatted}.`,
  });

  const text = `You've been invited to join ${inviterOrgName} on Nexorian

Role: ${roleTitle}
Organization: ${inviterOrgName}
Valid Until: ${expiryFormatted}

To accept your invitation, visit the link below:
${process.env.APP_URL || 'http://localhost:3000'}${inviteUrl}

Nexorian Security & Identity System`;

  return await sendEmailSafely({
    to,
    subject: `Invitation: Join ${inviterOrgName} on Nexorian as ${role}`,
    html,
    text,
  });
}

/**
 * 3. Sends Membership Approval Email
 */
async function sendMembershipApprovalEmail({ to, name, orgName, role }) {
  const loginUrl = '/sign-in';

  const html = buildEmailTemplate({
    title: `Membership Approved for ${orgName}`,
    badge: 'MEMBERSHIP ACTIVE',
    contentHtml: `
      <p class="text">Hello ${name || 'there'},</p>
      <p class="text">Great news! Your request to join <strong>${orgName}</strong> has been approved by the organization owner.</p>
      <div class="details-box">
        <strong>Organization:</strong> ${orgName}<br>
        <strong>Assigned Role:</strong> ${role || 'Member'}<br>
        <strong>Access Status:</strong> ACTIVE
      </div>
      <p class="text">You can now sign in with your credentials to access your organization workspace, documentation, and project telemetry.</p>
    `,
    ctaText: 'Sign In to Workspace',
    ctaUrl: loginUrl,
    footerNote: 'Your access permissions are governed by your assigned organization role policy.',
  });

  const text = `Hello ${name || 'there'},

Your request to join ${orgName} on Nexorian has been approved!

Organization: ${orgName}
Role: ${role || 'Member'}
Status: ACTIVE

Sign in to access your workspace:
${process.env.APP_URL || 'http://localhost:3000'}/sign-in

Nexorian Security & Identity System`;

  return await sendEmailSafely({
    to,
    subject: `Your membership to ${orgName} is now active`,
    html,
    text,
  });
}

/**
 * 4. Sends Membership Rejection Email
 */
async function sendMembershipRejectionEmail({ to, name, orgName }) {
  const html = buildEmailTemplate({
    title: `Update regarding your join request to ${orgName}`,
    badge: 'REQUEST UPDATE',
    contentHtml: `
      <p class="text">Hello ${name || 'there'},</p>
      <p class="text">We are writing to notify you that your request to join <strong>${orgName}</strong> was not approved at this time.</p>
      <p class="text">If you believe this was in error, please contact the organization administrator or owner directly to request a new invitation.</p>
    `,
    footerNote: 'Nexorian Security & Identity System',
  });

  const text = `Hello ${name || 'there'},

Your request to join ${orgName} on Nexorian was not approved at this time.

If you believe this was in error, please contact your organization administrator.

Nexorian Security & Identity System`;

  return await sendEmailSafely({
    to,
    subject: `Update regarding your request to join ${orgName}`,
    html,
    text,
  });
}

/**
 * 5. Sends Password Reset Email
 */
async function sendPasswordResetEmail({ to, name, resetUrl, code }) {
  const html = buildEmailTemplate({
    title: 'Reset Your Nexorian Password',
    badge: 'SECURITY ALERT',
    contentHtml: `
      <p class="text">Hello ${name || 'there'},</p>
      <p class="text">We received a request to reset the password for your Nexorian account. Use the link or verification code below to set a new password.</p>
      ${code ? `
      <div class="otp-card">
        <div class="otp-label">Password Reset Code</div>
        <div class="otp-code">${code}</div>
      </div>
      ` : ''}
      <p class="text">If you did not request a password reset, please secure your account immediately or contact your organization administrator.</p>
    `,
    ctaText: 'Reset Password',
    ctaUrl: resetUrl,
    footerNote: 'This password reset link will expire in 30 minutes.',
  });

  const text = `Hello ${name || 'there'},

We received a request to reset your Nexorian password.

${code ? `Reset Code: ${code}\n` : ''}
Reset Link: ${process.env.APP_URL || 'http://localhost:3000'}${resetUrl}

If you did not request this, please ignore this email.

Nexorian Security & Identity System`;

  return await sendEmailSafely({
    to,
    subject: 'Reset your Nexorian password',
    html,
    text,
  });
}

module.exports = {
  createTransporter,
  resetTransporter,
  sendEmailSafely,
  buildEmailTemplate,
  sendVerificationOtpEmail,
  sendInvitationEmail,
  sendMembershipApprovalEmail,
  sendMembershipRejectionEmail,
  sendPasswordResetEmail,
  getTestInbox,
  clearTestInbox,
};
