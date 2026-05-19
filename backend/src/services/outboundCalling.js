const twilio = require('twilio');
const cron = require('node-cron');
const db = require('./db');

let twilioClient;
function getTwilio() {
  if (!twilioClient) twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

function isWithinCallWindow(timezone) {
  const now = new Date();
  const hour = parseInt(
    now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }),
    10
  );
  return hour >= 9 && hour < 18;
}

async function canCallClient(clientId) {
  const { rows } = await db.query(
    'SELECT contact_consent, last_contacted_at FROM clients WHERE id = $1',
    [clientId]
  );
  const client = rows[0];
  if (!client?.contact_consent) return false;
  if (client.last_contacted_at) {
    const daysSince = (Date.now() - new Date(client.last_contacted_at).getTime()) / 86400000;
    if (daysSince < 7) return false;
  }
  return true;
}

async function initiateOutboundCall({ clientId, campaignCallId }) {
  const timezone = process.env.HOTEL_TIMEZONE || 'Africa/Nairobi';
  if (!isWithinCallWindow(timezone)) {
    return { skipped: true, reason: 'Outside call window (9AM–6PM)' };
  }

  const allowed = await canCallClient(clientId);
  if (!allowed) {
    await db.query(`UPDATE campaign_calls SET status = 'failed' WHERE id = $1`, [campaignCallId]);
    return { skipped: true, reason: 'Client not eligible for outbound call' };
  }

  const { rows } = await db.query('SELECT phone, name FROM clients WHERE id = $1', [clientId]);
  const client = rows[0];
  if (!client?.phone) return { skipped: true, reason: 'No phone number' };

  const serverUrl = process.env.SERVER_URL || `https://${process.env.RAILWAY_STATIC_URL}`;

  await db.query(
    `UPDATE campaign_calls SET status = 'calling', called_at = NOW() WHERE id = $1`,
    [campaignCallId]
  );

  const call = await getTwilio().calls.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: client.phone,
    url: `${serverUrl}/twiml/outbound`,
    statusCallback: `${serverUrl}/api/campaigns/call-status`,
    statusCallbackMethod: 'POST',
  });

  return { callSid: call.sid };
}

async function runCampaignBatch(logger) {
  const { rows } = await db.query(
    `SELECT cc.id, cc.client_id, c.max_calls_per_day, c.status AS campaign_status
     FROM campaign_calls cc
     JOIN campaigns c ON c.id = cc.campaign_id
     WHERE cc.status = 'pending'
     LIMIT 50`
  );

  let callCount = 0;
  for (const call of rows) {
    if (call.campaign_status !== 'active') continue;
    if (callCount >= (call.max_calls_per_day || 20)) break;

    const result = await initiateOutboundCall({
      clientId: call.client_id,
      campaignCallId: call.id,
    }).catch((err) => ({ error: err.message }));

    logger?.info({ campaignCallId: call.id, result }, 'Outbound call result');
    callCount++;
  }
}

async function queueFollowUpCalls() {
  const { rows: campaign } = await db.query(
    `SELECT id FROM campaigns WHERE type = 'follow_up' AND status = 'active' LIMIT 1`
  );
  if (!campaign[0]) return;

  const { rows: clients } = await db.query(
    `SELECT id FROM clients
     WHERE contact_consent = true
       AND last_stay_date BETWEEN CURRENT_DATE - INTERVAL '3 days' AND CURRENT_DATE - INTERVAL '2 days'`
  );

  for (const c of clients) {
    await db.query(
      `INSERT INTO campaign_calls (campaign_id, client_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT DO NOTHING`,
      [campaign[0].id, c.id]
    );
  }
}

function initOutboundScheduler(logger) {
  cron.schedule('0 8 * * *', () =>
    queueFollowUpCalls().catch((e) => logger?.error(e, 'Follow-up queue error'))
  );
  cron.schedule('0 9-17 * * *', () =>
    runCampaignBatch(logger).catch((e) => logger?.error(e, 'Campaign batch error'))
  );
  logger?.info('Outbound call scheduler initialized');
}

module.exports = { initiateOutboundCall, runCampaignBatch, initOutboundScheduler };
