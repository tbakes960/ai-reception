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
    const { from, to, clientId } = req.query;
    const status = ['pending', 'confirmed', 'cancelled'].includes(req.query.status) ? req.query.status : null;
    const conditions = ['b.tenant_id = $1'];
    const params = [req.tenantId];
    let idx = 2;

    if (from)     { conditions.push(`b.date >= $${idx++}`); params.push(from); }
    if (to)       { conditions.push(`b.date <= $${idx++}`); params.push(to); }
    if (status)   { conditions.push(`b.status = $${idx++}`); params.push(status); }
    if (clientId) { conditions.push(`b.client_id = $${idx++}`); params.push(clientId); }

    const { rows } = await db.query(
      `SELECT b.id, b.date, b.time, b.service, b.status, b.duration_minutes, b.notes, b.created_at,
              c.name AS client_name, c.phone AS client_phone, c.email AS client_email
       FROM bookings b
       LEFT JOIN clients c ON c.id = b.client_id AND c.tenant_id = b.tenant_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.date ASC, b.time ASC`,
      params
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, date, time, service, duration_minutes, notes } = req.body;
    if (!client_id || !date || !time || !service) {
      return res.status(400).json({ error: 'client_id, date, time, service required' });
    }
    // Verify client belongs to this tenant
    const { rows: clientCheck } = await db.query(
      'SELECT id, name, email, phone FROM clients WHERE id = $1 AND tenant_id = $2',
      [client_id, req.tenantId]
    );
    if (!clientCheck[0]) return res.status(404).json({ error: 'Client not found' });

    const { rows } = await db.query(
      `INSERT INTO bookings (tenant_id, client_id, date, time, service, duration_minutes, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed') RETURNING *`,
      [req.tenantId, client_id, date, time, service.slice(0, 200), duration_minutes || 60, notes?.slice(0, 1000) || null]
    );
    const booking = rows[0];
    const client = clientCheck[0];

    syncBookingToCalendar(booking.id).catch(() => {});
    if (client.email) sendBookingConfirmation({ to: client.email, guestName: client.name, booking }).catch(() => {});
    if (client.phone) sendSMSMessage(client.phone, `Booking confirmed: ${service} on ${date} at ${time}. — ${process.env.HOTEL_NAME}`).catch(() => {});

    res.status(201).json(booking);
  } catch {
    res.status(400).json({ error: 'Failed to create booking' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const allowed = ['date', 'time', 'service', 'status', 'notes', 'duration_minutes'];
    const validStatuses = ['pending', 'confirmed', 'cancelled'];
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [k, v] of Object.entries(req.body)) {
      if (!allowed.includes(k)) continue;
      if (k === 'status' && !validStatuses.includes(v)) continue;
      fields.push(`${k} = $${idx++}`);
      values.push(v);
    }
    if (!fields.length) return res.status(400).json({ error: 'No valid fields provided' });
    values.push(req.params.id, req.tenantId);
    const { rows } = await db.query(
      `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(rows[0]);
  } catch {
    res.status(400).json({ error: 'Failed to update booking' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND tenant_id = $2 RETURNING id, status`,
      [req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
