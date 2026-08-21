const express = require('express');
const { createInvite, validateInviteToken, acceptInvite, revokeInvite } = require('../services/inviteService');
const { requireAuth } = require('../middleware/authGuard');
const { requireTenant } = require('../middleware/tenantGuard');
const { requireRole } = require('../middleware/rbacGuard');
const defaultPrisma = require('../db');

const router = express.Router();

// Send Invite (Founder / Org Owner / Admin)
router.post('/', requireAuth, requireTenant, requireRole(['FOUNDER', 'ORG_OWNER', 'ADMIN']), async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Recipient email address is required.' });
    }
    const invite = await createInvite({
      organizationId: req.tenant.id,
      email,
      role: role || 'MEMBER',
      invitedByUser: req.user,
    });
    res.status(201).json(invite);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// List Pending Invites (Founder / Org Owner / Admin)
router.get('/pending', requireAuth, requireTenant, requireRole(['FOUNDER', 'ORG_OWNER', 'ADMIN']), async (req, res) => {
  try {
    const invites = await defaultPrisma.invite.findMany({
      where: { organizationId: req.tenant.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(invites);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve invites.' });
  }
});

// Public Token Verification (Worker / Client opening invite link)
router.get('/verify/:token', async (req, res) => {
  try {
    const inviteInfo = await validateInviteToken(req.params.token);
    res.status(200).json(inviteInfo);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
});

// Accept Invite (Authenticated Worker / Client)
router.post('/accept', requireAuth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Invite token is required.' });
    }
    const result = await acceptInvite({ token, user: req.user });
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
  }
});

// Revoke Invite (Founder / Org Owner / Admin)
router.post('/:id/revoke', requireAuth, requireTenant, requireRole(['FOUNDER', 'ORG_OWNER', 'ADMIN']), async (req, res) => {
  try {
    const result = await revokeInvite(req.params.id, req.user);
    res.status(200).json({ success: true, message: 'Invite revoked successfully.', invite: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;