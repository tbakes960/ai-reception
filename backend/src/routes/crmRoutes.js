const express = require('express');
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(requireAuth, apiLimiter);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = '';

    if (search) {
      params.push(`%${search}%`);
      where = `WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1`;
    }

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      db.query(
        `SELECT * FROM clients ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(`SELECT COUNT(*) FROM clients ${where}`, params),
    ]);

    res.json({ data, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [{ rows: clientRows }, { rows: bookings }, { rows: conversations }] = await Promise.all([
      db.query('SELECT * FROM clients WHERE id = $1', [req.params.id]),
      db.query('SELECT * FROM bookings WHERE client_id = $1 ORDER BY date DESC', [req.params.id]),
      db.query('SELECT id, created_at, summary, sentiment, direction FROM conversations WHERE client_id = $1 ORDER BY created_at DESC LIMIT 10', [req.params.id]),
    ]);
    if (!clientRows[0]) return res.status(404).json({ error: 'Client not found' });
    res.json({ ...clientRows[0], bookings, conversations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, notes, contact_consent } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await db.query(
      'INSERT INTO clients (name, phone, email, notes, contact_consent) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, phone || null, email || null, notes || null, !!contact_consent]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'email', 'notes', 'medical_notes', 'contact_consent', 'preferred_contact_method'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) { fields.push(`${k} = $${idx++}`); values.push(v); }
    }
    if (!fields.length) return res.status(400).json({ error: 'No valid fields' });
    values.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
