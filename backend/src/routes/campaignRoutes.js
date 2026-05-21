const express = require('express');
const db = require('../services/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { runCampaignBatch } = require('../services/outboundCalling');

const router = express.Router();
router.use(requireAuth, apiLimiter);

const VALID_TYPES   = ['follow_up', 're_engagement', 'promotion'];
const VALID_STATUSES = ['active', 'paused', 'completed'];

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM campaigns WHERE tenant_id = $1 ORDER BY created_at DESC',
      [req.tenantId]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, type, trigger_days_after, max_calls_per_day, script_template } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Campaign name required' });
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid campaign type' });

    const callsPerDay = Math.min(500, Math.max(1, parseInt(max_calls_per_day) || 20));
    const { rows } = await db.query(
      `INSERT INTO campaigns (tenant_id, name, type, trigger_days_after, max_calls_per_day, script_template)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.tenantId, name.trim().slice(0, 200), type, trigger_days_after || null, callsPerDay, script_template?.slice(0, 2000) || null]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(400).json({ error: 'Failed to create campaign' });
  }
});

router.put('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { rows } = await db.query(
      'UPDATE campaigns SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *',
      [status, req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Campaign not found' });
    res.json(rows[0]);
  } catch {
    res.status(400).json({ error: 'Failed to update campaign' });
  }
});

router.get('/:id/calls', async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const { rows } = await db.query(
      `SELECT cc.id, cc.status, cc.scheduled_at, cc.called_at,
              c.name AS client_name, c.phone AS client_phone
       FROM campaign_calls cc
       LEFT JOIN clients c ON c.id = cc.client_id AND c.tenant_id = cc.tenant_id
       WHERE cc.campaign_id = $1 AND cc.tenant_id = $2
       ORDER BY cc.created_at DESC
       LIMIT $3`,
      [req.params.id, req.tenantId, limit]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch campaign calls' });
  }
});

router.post('/run-batch', requireAdmin, async (req, res) => {
  try {
    await runCampaignBatch(req.tenantId);
    res.json({ message: 'Batch triggered' });
  } catch {
    res.status(500).json({ error: 'Batch failed' });
  }
});

// Twilio call-status callback — no auth, Twilio signs this separately
router.post('/call-status', async (req, res) => {
  const { CallSid, CallStatus } = req.body;
  if (CallSid) {
    const status = CallStatus === 'completed' ? 'completed' : 'failed';
    await db.query('UPDATE campaign_calls SET status = $1 WHERE call_sid = $2', [status, CallSid]).catch(() => {});
  }
  res.sendStatus(200);
});

module.exports = router;
