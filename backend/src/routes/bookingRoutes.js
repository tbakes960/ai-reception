const express = require('express');
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { syncBookingToCalendar } = require('../services/calendarService');
const { sendBookingConfirmation } = require('../services/emailService');
const { sendSMSMessage } = require('../services/smsService');

const router = express.Router();
router.use(requireAuth, apiLimiter);

router.get('/', async (req, res) => {
  try {
    const { from, to, status, clientId } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (from)     { conditions.push(`b.date >= $${idx++}`); params.push(from); }
    if (to)       { conditions.push(`b.date <= $${idx++}`); params.push(to); }
    if (status)   { conditions.push(`b.status = $${idx++}`); params.push(status); }
    if (clientId) { conditions.push(`b.client_id = $${idx++}`); params.push(clientId); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query(
      `SELECT b.*, c.name AS client_name, c.phone AS client_phone, c.email AS client_email
       FROM bookings b
       LEFT JOIN clients c ON c.id = b.client_id
       ${where}
       ORDER BY b.date ASC, b.time ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, date, time, service, duration_minutes, notes } = req.body;
    if (!client_id || !date || !time || !service) {
      return res.status(400).json({ error: 'client_id, date, time, service required' });
    }

    const { rows } = await db.query(
      `INSERT INTO bookings (client_id, date, time, service, duration_minutes, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed') RETURNING *`,
      [client_id, date, time, service, duration_minutes || 60, notes || null]
    );
    const booking = rows[0];

    const { rows: clientRows } = await db.query('SELECT name, email, phone FROM clients WHERE id = $1', [client_id]);
    const client = clientRows[0];

    syncBookingToCalendar(booking.id).catch(() => {});
    if (client?.email) sendBookingConfirmation({ to: client.email, guestName: client.name, booking }).catch(() => {});
    if (client?.phone) sendSMSMessage(client.phone, `Booking confirmed: ${service} on ${date} at ${time}. — ${process.env.HOTEL_NAME}`).catch(() => {});

    res.status(201).json({ ...booking, clients: client });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['date', 'time', 'service', 'status', 'notes', 'duration_minutes'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [k, v] of Object.entries(req.body)) {
      if (allowed.includes(k)) { fields.push(`${k} = $${idx++}`); values.push(v); }
    }
    if (!fields.length) return res.status(400).json({ error: 'No valid fields' });
    values.push(req.params.id);
    const { rows } = await db.query(`UPDATE bookings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *`, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
