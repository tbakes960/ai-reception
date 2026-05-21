const express = require('express');
const db = require('../services/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(requireAuth, apiLimiter);

const MAX_LIMIT = 100;

router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search?.slice(0, 200) || null;
    const params = [req.tenantId];
    let where = 'WHERE tenant_id = $1';

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      db.query(
        `SELECT id, name, phone, email, notes, contact_consent, preferred_contact_method, last_stay_date, last_contacted_at, created_at
         FROM clients ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM clients ${where}`, params),
    ]);

    res.json({ data, total: parseInt(countRows[0].count), page, limit });
  } catch {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [{ rows: clientRows }, { rows: bookings }, { rows: conversations }] = await Promise.all([
      db.query(
        'SELECT id, name, phone, email, notes, contact_consent, preferred_contact_method, last_stay_date, last_contacted_at, created_at FROM clients WHERE id = $1 AND tenant_id = $2',
        [req.params.id, req.tenantId]
      ),
      db.query('SELECT * FROM bookings WHERE client_id = $1 AND tenant_id = $2 ORDER BY date DESC', [req.params.id, req.tenantId]),
      db.query(
        'SELECT id, created_at, summary, sentiment, direction FROM conversations WHERE client_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 10',
        [req.params.id, req.tenantId]
      ),
    ]);
    if (!clientRows[0]) return res.status(404).json({ error: 'Client not found' });
    res.json({ ...clientRows[0], bookings, conversations });
  } catch {
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// medical_notes read — admin only
router.get('/:id/medical', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, medical_notes FROM clients WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Client not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to fetch medical notes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, notes, contact_consent } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name required' });
    }
    const { rows } = await db.query(
      `INSERT INTO clients (tenant_id, name, phone, email, notes, contact_consent, contact_consent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, phone, email, notes, contact_consent, created_at`,
      [req.tenantId, name.trim().slice(0, 200), phone?.slice(0, 20) || null, email?.slice(0, 200) || null,
       notes?.slice(0, 2000) || null, !!contact_consent, contact_consent ? new Date() : null]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(400).json({ error: 'Failed to create client' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'email', 'notes', 'contact_consent', 'preferred_contact_method', 'last_stay_date'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) { fields.push(`${k} = $${idx++}`); values.push(v); }
    }
    // Track consent timestamp when consent changes
    if (req.body.contact_consent === true) {
      fields.push(`contact_consent_at = $${idx++}`);
      values.push(new Date());
    }
    if (!fields.length) return res.status(400).json({ error: 'No valid fields provided' });
    values.push(req.params.id, req.tenantId);
    const { rows } = await db.query(
      `UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING id, name, phone, email, notes, contact_consent, preferred_contact_method`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Client not found' });
    res.json(rows[0]);
  } catch {
    res.status(400).json({ error: 'Failed to update client' });
  }
});

// medical_notes update — admin only
router.put('/:id/medical', requireAdmin, async (req, res) => {
  try {
    const { medical_notes } = req.body;
    const { rows } = await db.query(
      'UPDATE clients SET medical_notes = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id',
      [medical_notes?.slice(0, 5000) || null, req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Client not found' });
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Failed to update medical notes' });
  }
});

// GDPR: data export
router.get('/:id/export', async (req, res) => {
  try {
    const [{ rows: [client] }, { rows: bookings }, { rows: conversations }] = await Promise.all([
      db.query('SELECT * FROM clients WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]),
      db.query('SELECT * FROM bookings WHERE client_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]),
      db.query('SELECT id, created_at, summary, sentiment, direction, duration_seconds FROM conversations WHERE client_id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]),
    ]);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    delete client.medical_notes; // export safe copy without sensitive clinical data unless admin
    res.setHeader('Content-Disposition', `attachment; filename="guest-data-${req.params.id}.json"`);
    res.json({ exported_at: new Date(), client, bookings, conversations });
  } catch {
    res.status(500).json({ error: 'Export failed' });
  }
});

// GDPR: anonymised deletion (Right to be Forgotten) — preserves booking records for accounting
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: [client] } = await db.query(
      'SELECT id FROM clients WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenantId]
    );
    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Anonymise rather than hard-delete — preserves FK integrity and accounting records
    await db.query(
      `UPDATE clients SET
         name = 'Deleted User',
         phone = NULL,
         email = NULL,
         notes = NULL,
         medical_notes = NULL,
         contact_consent = FALSE,
         contact_consent_at = NULL
       WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    // Scrub transcript PII from conversations
    await db.query(
      `UPDATE conversations SET transcript = '[]'::jsonb, summary = 'Deleted'
       WHERE client_id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    res.json({ success: true, message: 'Client data anonymised per GDPR Article 17' });
  } catch {
    res.status(500).json({ error: 'Deletion failed' });
  }
});

module.exports = router;
