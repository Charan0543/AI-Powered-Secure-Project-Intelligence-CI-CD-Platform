# Mailpit Local Email Testing Guide for Nexorian

This guide explains how to use **Mailpit** as the local SMTP testing server for Nexorian. With Mailpit, all transactional emails (OTP verification codes, organization invitations, join approval notices, and password reset links) are safely captured locally and viewable in a modern web UI without sending real emails.

---

## 1. Quick Overview

| Service | Address / Port | Purpose |
|---|---|---|
| **Mailpit SMTP Server** | `localhost:1025` | Captures outgoing SMTP emails from Nexorian |
| **Mailpit Web UI** | [http://localhost:8025](http://localhost:8025) | Interactive web interface to view & inspect emails |
| **Nexorian Web App** | [http://localhost:3000](http://localhost:3000) | Express.js application |

---

## 2. Installing Mailpit

### Option A: Windows (via Windows Package Manager - Recommended)
Open PowerShell or Command Prompt and run:
```powershell
winget install axllent.mailpit
```
Or use the npm script:
```bash
npm run mailpit:install
```

### Option B: Standalone Binary (Windows / macOS / Linux)
1. Download the latest release from [Mailpit GitHub Releases](https://github.com/axllent/mailpit/releases).
2. Extract `mailpit.exe` (or `mailpit` binary) to a folder in your `PATH` or your project directory.

### Option C: Docker
```bash
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

---

## 3. Running Mailpit

In a separate terminal window, start the Mailpit server:
```bash
mailpit
```
You will see output similar to:
```
Mailpit is running:
  SMTP server: localhost:1025
  HTTP server: http://localhost:8025
```

---

## 4. Configuring Nexorian

Nexorian is preconfigured in `.env` to route all emails to Mailpit in development:

```env
# Email / SMTP Configuration
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Nexorian Security <security@nexorian.internal>"

# Mailpit Web UI URL for reference
MAILPIT_WEB_URL="http://localhost:8025"
```

> [!NOTE]
> **Safety Guarantee**: In development mode (`NODE_ENV=development`), Nexorian explicitly connects to Mailpit. No real emails will ever be dispatched to external email providers.

---

## 5. End-to-End Testing Workflows

### Flow 1: Organization Creation & OTP Verification
1. Start Nexorian: `npm run dev`
2. Open **[http://localhost:3000/create-organization](http://localhost:3000/create-organization)** in your browser.
3. Fill in your name, email (e.g. `founder@mycompany.internal`), and organization details, then submit.
4. Open the Mailpit Web UI at **[http://localhost:8025](http://localhost:8025)**.
5. Click on the email with subject `Your Nexorian Verification Code: XXXXXX`.
6. Copy the 6-digit verification code and paste it on the verification screen to activate your OWNER membership.

---

### Flow 2: Role Invitation & Join Request
1. Sign in to the **Owner Portal** at [http://localhost:3000/owner-portal](http://localhost:3000/owner-portal).
2. Click **Invite Member**, enter an email (e.g. `cto@mycompany.internal`), select the role (`CEO` or `OWNER`), and click **Send Invitation**.
3. In Mailpit (**[http://localhost:8025](http://localhost:8025)**), open the email titled `Invitation: Join [OrgName] on Nexorian as [Role]`.
4. Click the **Accept Invitation & Join** button (or copy the `/join-organization?token=...` link).
5. Complete the join form and submit.
6. Check Mailpit for the applicant's OTP verification email, enter the code, and confirm the join request enters `PENDING_APPROVAL`.

---

### Flow 3: Owner Approval / Rejection
1. Return to the **Owner Portal** at [http://localhost:3000/owner-portal](http://localhost:3000/owner-portal).
2. Under **Pending Join Requests**, click **Approve** (or **Reject**).
3. Check Mailpit: a transactional notification email (`Your membership to [OrgName] is now active`) will be captured immediately.

---

### Flow 4: Resend OTP or Refresh Invitation
- **Resend Code**: Generates a fresh 6-digit OTP code with a 15-minute countdown and sends a new email.
- **Resend Invitation**: Generates a fresh secure token and refreshes the 7-day expiration date.

---

## 6. Inspecting Captured Emails in Mailpit

Mailpit provides comprehensive debugging tools:
- **HTML Preview**: Exact rendered output of responsive email templates.
- **Plain Text View**: Fallback plain-text layout.
- **Headers & Metadata**: Inspect `To`, `From`, `Subject`, `Message-ID`, and date timestamps.
- **Raw MIME Source**: View unparsed email source and MIME boundaries.
- **Search & Tagging**: Filter emails by recipient, subject, or content.
- **REST API**: Automated scripts can query `http://localhost:8025/api/v1/messages`.

---

## 7. Running Automated Tests

Run the full test suite (including email template rendering and failure resiliency):
```bash
npm test
```
All 22 unit & integration tests run safely using in-memory mock transports with zero external network dependencies.
