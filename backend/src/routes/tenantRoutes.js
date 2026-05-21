const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../services/db');
const { registerLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// POST /api/tenant/register
router.post('/register', registerLimiter, [
  body('hotelName').trim().notEmpty(),
  body('ownerEmail').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('timezone').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { hotelName, ownerEmail, password, timezone } = req.body;

  try {
    const slug = hotelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) +
      '-' + Math.random().toString(36).slice(2, 6);

    const passwordHash = await bcrypt.hash(password, 12);

    const { rows: [tenant] } = await db.query(
      `INSERT INTO tenants (name, slug, owner_email, hotel_name, hotel_timezone, plan, status)
       VALUES ($1, $2, $3, $4, $5, 'starter', 'trial')
       RETURNING id, name, slug, status, trial_ends_at`,
      [hotelName, slug, ownerEmail, hotelName, timezone || 'Africa/Nairobi']
    );

    await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')`,
      [tenant.id, ownerEmail, passwordHash]
    );

    await db.query(
      `INSERT INTO subscriptions (tenant_id, status, amount_usd)
       VALUES ($1, 'pending', 29.00)`,
      [tenant.id]
    );

    const token = jwt.sign(
      { userId: ownerEmail, tenantId: tenant.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, tenant });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/tenant/me
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { tenantId } = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    const { rows: [tenant] } = await db.query(
      `SELECT t.*, s.status AS sub_status, s.paypal_subscription_id, s.current_period_end
       FROM tenants t
       LEFT JOIN subscriptions s ON s.tenant_id = t.id
       WHERE t.id = $1`,
      [tenantId]
    );
    if (!tenant) return res.status(404).json({ error: 'Not found' });
    res.json(tenant);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// PUT /api/tenant/settings
router.put('/settings', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { tenantId } = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    const { hotelName, timezone, twilioPhone, voiceId, workingHoursStart, workingHoursEnd } = req.body;
    const { rows: [updated] } = await db.query(
      `UPDATE tenants SET
        hotel_name = COALESCE($1, hotel_name),
        hotel_timezone = COALESCE($2, hotel_timezone),
        twilio_phone = COALESCE($3, twilio_phone),
        elevenlabs_voice_id = COALESCE($4, elevenlabs_voice_id),
        working_hours_start = COALESCE($5, working_hours_start),
        working_hours_end = COALESCE($6, working_hours_end)
       WHERE id = $7 RETURNING *`,
      [hotelName, timezone, twilioPhone, voiceId, workingHoursStart, workingHoursEnd, tenantId]
    );
    res.json(updated);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
