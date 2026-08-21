const express = require('express');
const { requireAuth } = require('../middleware/authGuard');
const { requireTenant } = require('../middleware/tenantGuard');
const { requireRole } = require('../middleware/rbacGuard');
const defaultPrisma = require('../db');

const router = express.Router();

// Retrieve tenant audit logs (Founder / Org Owner only)
router.get('/', requireAuth, requireTenant, requireRole(['FOUNDER', 'ORG_OWNER']), async (req, res) => {
  try {
    const logs = await defaultPrisma.auditLog.findMany({
      where: { tenantId: req.tenant.id },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

module.exports = router;