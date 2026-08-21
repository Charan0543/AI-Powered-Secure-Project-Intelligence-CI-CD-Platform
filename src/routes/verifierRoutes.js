const express = require('express');
const { getVerificationQueue, getVerificationDetail, submitManualDecision } = require('../services/verificationService');
const { requireAuth } = require('../middleware/authGuard');
const { requireNexorianStaff } = require('../middleware/rbacGuard');

const router = express.Router();

// Apply Auth and Staff guard to all verifier endpoints
router.use(requireAuth, requireNexorianStaff);

router.get('/requests', async (req, res) => {
  try {
    const statusFilter = req.query.status || null;
    const queue = await getVerificationQueue(statusFilter);
    res.status(200).json(queue);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve verification queue.' });
  }
});

router.get('/requests/:id', async (req, res) => {
  try {
    const detail = await getVerificationDetail(req.params.id);
    res.status(200).json(detail);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/requests/:id/decision', async (req, res) => {
  try {
    const { decision, rationale } = req.body;
    const result = await submitManualDecision(req.params.id, req.user, { decision, rationale });
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;