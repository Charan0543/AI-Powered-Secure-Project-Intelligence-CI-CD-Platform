const express = require('express');
const { requireAuth } = require('../middleware/authGuard');
const { requireTenant } = require('../middleware/tenantGuard');
const { requireDocsAccess } = require('../middleware/rbacGuard');
const { getRawProjectDocuments } = require('../services/docsService');

const router = express.Router();

// Workspace Summary (All active members)
router.get('/summary', requireAuth, requireTenant, async (req, res) => {
  try {
    res.status(200).json({
      organization: {
        id: req.tenant.id,
        name: req.tenant.name,
        slug: req.tenant.slug,
        isVerified: req.tenant.isVerified,
        status: req.tenant.status,
      },
      membership: {
        role: req.membership.role,
        status: req.membership.status,
      },
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve workspace summary.' });
  }
});

// Raw Project Documentation (Internal Roles Only - CLIENT is blocked with 403)
router.get('/docs', requireAuth, requireTenant, requireDocsAccess, async (req, res) => {
  try {
    const docsPayload = await getRawProjectDocuments(req.tenant, req.membership);
    res.status(200).json(docsPayload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve documentation.' });
  }
});

module.exports = router;