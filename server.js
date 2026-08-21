/**
 * Nexorian - Server Application (Phase 1)
 * Express.js backend serving multi-tenant B2B SaaS platform with tenant-aware RBAC,
 * hybrid organization verification, invite-based onboarding, and client docs protection.
 */

const express = require('express');
const path = require('path');
const authRoutes = require('./src/routes/authRoutes');
const orgRoutes = require('./src/routes/orgRoutes');
const inviteRoutes = require('./src/routes/inviteRoutes');
const verifierRoutes = require('./src/routes/verifierRoutes');
const workspaceRoutes = require('./src/routes/workspaceRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const { seedDemoData } = require('./src/utils/seedDemoData');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'Nexorian',
    phase: 'Phase 1 - Multi-Tenant SaaS Foundation',
    tagline: 'Secure. Permission-aware. Project-focused.',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', orgRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/verifier', verifierRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/audit-logs', auditRoutes);

// Public Web Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/sign-in', (req, res) => {
  res.sendFile(path.join(__dirname, 'sign-in.html'));
});

app.get('/create-organization', (req, res) => {
  res.sendFile(path.join(__dirname, 'create-organization.html'));
});

app.get('/join-organization', (req, res) => {
  res.sendFile(path.join(__dirname, 'join-organization.html'));
});

app.get('/accept-invite', (req, res) => {
  res.sendFile(path.join(__dirname, 'accept-invite.html'));
});

app.get('/invite/accept', (req, res) => {
  res.sendFile(path.join(__dirname, 'accept-invite.html'));
});

app.get('/status', (req, res) => {
  res.sendFile(path.join(__dirname, 'status.html'));
});

// The Two Private Portals of Nexorian Phase 1:
// 1. Staff Verifier Portal (Internal Nexorian Staff Only)
app.get(['/verifier', '/verifier-dashboard', '/staff', '/staff-portal'], (req, res) => {
  res.sendFile(path.join(__dirname, 'verifier-dashboard.html'));
});

// 2. Owner Portal (Single Unified Company-Side Portal for all tenant roles)
app.get(['/owner-portal', '/owner', '/portal', '/app', '/workspace', '/admin-portal', '/client-portal'], (req, res) => {
  res.sendFile(path.join(__dirname, 'owner-portal.html'));
});

// Global 404 handler for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Fallback to landing page for all other unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.statusCode || 500).json({ error: err.message || 'Internal server error.' });
});

if (require.main === module) {
  seedDemoData().catch((err) => console.error('Seed error:', err));
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 Nexorian Phase 1 Server Active: http://localhost:${PORT}`);
    console.log(`🛡️  Public Landing: http://localhost:${PORT}`);
    console.log(`🛡️  Sign In:        http://localhost:${PORT}/sign-in`);
    console.log(`🛡️  Create Org:     http://localhost:${PORT}/create-organization`);
    console.log(`🛡️  Join Org:       http://localhost:${PORT}/join-organization`);
    console.log(`🛡️  Accept Invite:  http://localhost:${PORT}/accept-invite`);
    console.log(`👑  Owner Portal:   http://localhost:${PORT}/owner-portal`);
    console.log(`🛡️  Verifier:       http://localhost:${PORT}/verifier`);
    console.log(`====================================================`);
  });
}

module.exports = app;