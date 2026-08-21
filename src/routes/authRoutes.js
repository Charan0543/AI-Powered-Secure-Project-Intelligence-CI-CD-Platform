const express = require('express');
const { registerUser, verifyEmailOtp, loginUser, switchActiveTenant } = require('../services/authService');
const { requireAuth } = require('../middleware/authGuard');
const defaultPrisma = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, isStaff } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    const result = await registerUser({ name, email, password, isStaff: Boolean(isStaff) });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }
    const result = await verifyEmailOtp({ email, code });
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = await loginUser({ email, password });
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/switch-tenant', requireAuth, async (req, res) => {
  try {
    const { targetOrgId } = req.body;
    if (!targetOrgId) {
      return res.status(400).json({ error: 'Target organization ID is required.' });
    }
    const result = await switchActiveTenant(req.session.token, targetOrgId);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const memberships = await defaultPrisma.membership.findMany({
      where: { userId: req.user.id, status: 'ACTIVE' },
      include: { organization: true },
    });
    res.status(200).json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        isNexorianStaff: req.user.isNexorianStaff,
      },
      activeOrgId: req.session.activeOrgId,
      memberships: memberships.map(m => ({
        id: m.id,
        role: m.role,
        organization: m.organization,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await defaultPrisma.session.delete({ where: { id: req.session.id } }).catch(() => {});
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Logout error.' });
  }
});

module.exports = router;