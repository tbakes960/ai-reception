const express = require('express');
const axios = require('axios');
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');
const { webhookLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const PAYPAL_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PLAN_ID = process.env.PAYPAL_PLAN_ID;

async function getPayPalToken() {
  const res = await axios.post(`${PAYPAL_BASE}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth: { username: process.env.PAYPAL_CLIENT_ID, password: process.env.PAYPAL_CLIENT_SECRET },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  return res.data.access_token;
}

// GET /api/subscription/status
router.get('/status', requireAuth, async (req, res) => {
  const { rows: [sub] } = await db.query(
    `SELECT * FROM subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [req.tenantId]
  );
  res.json(sub || { status: 'none' });
});

// POST /api/subscription/create-order
// Returns a PayPal subscription approval URL for client redirect
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const token = await getPayPalToken();
    const { data } = await axios.post(
      `${PAYPAL_BASE}/v1/billing/subscriptions`,
      {
        plan_id: PLAN_ID,
        application_context: {
          brand_name: 'Rehema AI',
          return_url: `${process.env.SERVER_URL}/api/subscription/capture`,
          cancel_url: `${process.env.FRONTEND_URL}/billing?cancelled=1`,
          user_action: 'SUBSCRIBE_NOW',
        },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    const approveLink = data.links.find(l => l.rel === 'approve');
    res.json({ subscriptionId: data.id, approveUrl: approveLink?.href });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create PayPal subscription' });
  }
});

// GET /api/subscription/capture?subscription_id=xxx
router.get('/capture', requireAuth, async (req, res) => {
  const { subscription_id } = req.query;
  try {
    const token = await getPayPalToken();
    const { data } = await axios.get(
      `${PAYPAL_BASE}/v1/billing/subscriptions/${subscription_id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    await db.query(
      `UPDATE subscriptions SET
         paypal_subscription_id = $1,
         paypal_plan_id = $2,
         status = 'active',
         current_period_start = NOW(),
         current_period_end = NOW() + INTERVAL '30 days',
         updated_at = NOW()
       WHERE tenant_id = $3`,
      [data.id, data.plan_id, req.tenantId]
    );

    await db.query(
      `UPDATE tenants SET status = 'active' WHERE id = $1`,
      [req.tenantId]
    );

    res.redirect(`${process.env.FRONTEND_URL}/billing?success=1`);
  } catch {
    res.redirect(`${process.env.FRONTEND_URL}/billing?error=1`);
  }
});

// POST /api/subscription/webhook (PayPal IPN/webhook)
router.post('/webhook', webhookLimiter, express.raw({ type: 'application/json' }), async (req, res) => {
  const event = req.body;
  const subId = event?.resource?.id;

  if (!subId) return res.sendStatus(200);

  if (event.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' ||
      event.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
    await db.query(
      `UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE paypal_subscription_id = $2`,
      [event.event_type.includes('CANCEL') ? 'cancelled' : 'suspended', subId]
    );
    await db.query(
      `UPDATE tenants SET status = $1
       WHERE id = (SELECT tenant_id FROM subscriptions WHERE paypal_subscription_id = $2)`,
      [event.event_type.includes('CANCEL') ? 'cancelled' : 'suspended', subId]
    );
  }

  if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    await db.query(
      `UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE paypal_subscription_id = $1`,
      [subId]
    );
  }

  res.sendStatus(200);
});

module.exports = router;
