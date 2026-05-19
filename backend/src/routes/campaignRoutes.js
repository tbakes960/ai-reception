const express = require('express');
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { runCampaignBatch } = require('../services/outboundCalling');

const router = express.Router();
router.use(requireAuth, apiLimiter);

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM campaigns ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, trigger_days_after, max_calls_per_day, script_template } = req.body;
    const { rows } = await db.query(
      `INSERT INTO campaigns (name, type, trigger_days_after, max_calls_per_day, script_template)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, type, trigger_days_after || null, max_calls_per_day || 20, script_template || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused', 'completed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { rows } = await db.query(
      'UPDATE campaigns SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id/calls', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cc.*, c.name AS client_name, c.phone AS client_phone
       FROM campaign_calls cc
       LEFT JOIN clients c ON c.id = cc.client_id
       WHERE cc.campaign_id = $1
       ORDER BY cc.created_at DESC`,
      [req.params.id]
    );
    res.json(rows.map((r) => ({ ...r, clients: { name: r.client_name, phone: r.client_phone } })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/run-batch', async (req, res) => {
  try {
    await runCampaignBatch(null);
    res.json({ message: 'Batch triggered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Twilio call status callback (no auth)
router.post('/call-status', async (req, res) => {
  const { CallSid, CallStatus } = req.body;
  const status = CallStatus === 'completed' ? 'completed' : 'failed';
  await db.query('UPDATE campaign_calls SET status = $1 WHERE call_sid = $2', [status, CallSid]).catch(() => {});
  res.sendStatus(200);
});

module.exports = router;
