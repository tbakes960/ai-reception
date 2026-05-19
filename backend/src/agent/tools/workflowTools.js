const db = require('../../services/db');

async function createTicket({ issue, clientId, conversationId }) {
  const { rows } = await db.query(
    'INSERT INTO support_tickets (issue, client_id, conversation_id) VALUES ($1, $2, $3) RETURNING *',
    [issue, clientId || null, conversationId || null]
  );
  return rows[0];
}

async function applyCRMTag({ clientId, tag }) {
  const { rows: cur } = await db.query('SELECT notes FROM clients WHERE id = $1', [clientId]);
  const existing = cur[0]?.notes || '';
  const tagLine = `[TAG: ${tag}]`;
  if (existing.includes(tagLine)) return { message: 'Tag already applied' };
  const updated = existing ? `${existing}\n${tagLine}` : tagLine;
  const { rows } = await db.query('UPDATE clients SET notes = $1 WHERE id = $2 RETURNING *', [updated, clientId]);
  return rows[0];
}

async function triggerFollowUpSequence({ clientId }) {
  const { rows } = await db.query(
    `SELECT id FROM campaigns WHERE type = 'follow_up' AND status = 'active' LIMIT 1`
  );
  if (!rows[0]) return { message: 'No active follow-up campaign' };
  const { rows: ins } = await db.query(
    'INSERT INTO campaign_calls (campaign_id, client_id, status) VALUES ($1, $2, $3) RETURNING *',
    [rows[0].id, clientId, 'pending']
  );
  return ins[0];
}

async function addToEmailList({ clientId }) {
  return applyCRMTag({ clientId, tag: 'email-list' });
}

async function sendInvoice({ clientId }) {
  const { rows } = await db.query(
    `SELECT * FROM bookings WHERE client_id = $1 AND status = 'confirmed' ORDER BY date DESC LIMIT 5`,
    [clientId]
  );
  return { message: 'Invoice queued', bookings: rows };
}

const TOOL_DEFINITIONS = [
  {
    name: 'createTicket',
    description: 'Create a support ticket for a guest issue requiring human follow-up.',
    input_schema: {
      type: 'object',
      properties: {
        issue: { type: 'string' },
        clientId: { type: 'string' },
        conversationId: { type: 'string' },
      },
      required: ['issue'],
    },
  },
  {
    name: 'applyCRMTag',
    description: 'Apply a tag to a client record (e.g., "vip", "satisfied").',
    input_schema: {
      type: 'object',
      properties: { clientId: { type: 'string' }, tag: { type: 'string' } },
      required: ['clientId', 'tag'],
    },
  },
  {
    name: 'triggerFollowUpSequence',
    description: 'Queue a client for the post-stay follow-up call campaign.',
    input_schema: {
      type: 'object',
      properties: { clientId: { type: 'string' } },
      required: ['clientId'],
    },
  },
  {
    name: 'addToEmailList',
    description: 'Add a guest to the hotel email marketing list.',
    input_schema: {
      type: 'object',
      properties: { clientId: { type: 'string' } },
      required: ['clientId'],
    },
  },
  {
    name: 'sendInvoice',
    description: 'Send a booking invoice to a guest.',
    input_schema: {
      type: 'object',
      properties: { clientId: { type: 'string' } },
      required: ['clientId'],
    },
  },
];

module.exports = { createTicket, applyCRMTag, triggerFollowUpSequence, addToEmailList, sendInvoice, TOOL_DEFINITIONS };
