# Nexorian — Secure Project Intelligence Platform

> **"Secure. Permission-aware. Project-focused."**

Nexorian connects project knowledge, decisions, documentation, GitHub activity, and CI signals in one permission-aware workspace for software organizations.

---

## 🚀 Key Modules & Architecture

### 1. Multi-Tenant Organization Access System
- **Organization Creation**: Atomically registers personal user, organization, and `OWNER` membership in `PENDING_VERIFICATION` state.
- **Email Verification**: 6-digit OTP code verification activates `OWNER` membership to `ACTIVE` or transitions joiners to `PENDING_APPROVAL`.
- **Role-Locked Invitations**: Owners issue secure, single-use, time-limited invitation links strictly locked to either `CEO` or `OWNER` role.
- **Applicant Join Flow**: Invitee submits details and verifies email; membership enters `PENDING_APPROVAL`.
- **Owner Governance**: Owners approve or reject pending memberships from the dedicated **Owner Portal**.
- **Role Switching**: Organization owners switch member roles between `CEO` and `OWNER`.

### 2. Transactional Email System with Mailpit
- **Local SMTP Testing**: All authentication and invitation emails in development are captured locally by **Mailpit** (`localhost:1025`).
- **Interactive Inspection**: View responsive HTML email templates, plain text, headers, and metadata in Mailpit Web UI at **[http://localhost:8025](http://localhost:8025)**.
- **Safety Guarantee**: In development, no real emails are ever sent to external mailboxes.
- **Non-Blocking Resilience**: Email delivery errors are safely logged and will never break database transactions.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm
- SQLite / Prisma Client

### Installation
```bash
npm install
```

### Starting Mailpit (Local Email Testing Server)
1. Install Mailpit on Windows:
```bash
npm run mailpit:install
# Or: winget install axllent.mailpit
```
2. Start the Mailpit server in a separate terminal:
```bash
npm run mailpit
```
3. Open the Mailpit web UI: **[http://localhost:8025](http://localhost:8025)**

### Running Nexorian Locally
```bash
# Start server with watch mode
npm run dev
```

Visit the application routes:
- **Landing Page**: [http://localhost:3000](http://localhost:3000)
- **Create Organization**: [http://localhost:3000/create-organization](http://localhost:3000/create-organization)
- **Join Organization**: [http://localhost:3000/join-organization](http://localhost:3000/join-organization)
- **Owner Portal**: [http://localhost:3000/owner-portal](http://localhost:3000/owner-portal)
- **Sign In**: [http://localhost:3000/sign-in](http://localhost:3000/sign-in)
- **Mailpit Web UI**: [http://localhost:8025](http://localhost:8025)

---

## 🧪 Testing

Run the automated test suite (22 unit & integration test suites):
```bash
npm test
```
Tests cover:
- Multi-tenant organization creation, OTP verification, role locking, conflict handling, and owner approval.
- Transactional email template rendering, non-blocking failure resiliency, and resend token generation.

For complete Mailpit setup details, see [MAILPIT_SETUP.md](./MAILPIT_SETUP.md).
