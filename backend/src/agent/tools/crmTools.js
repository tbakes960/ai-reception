const db = require('../../services/db');

async function getClient(phone) {
  const { rows } = await db.query('SELECT * FROM clients WHERE phone = $1', [phone]);
  if (!rows[0]) throw new Error('Client not found');
  return rows[0];
}

async function createClient({ name, phone, email }) {
  const { rows } = await db.query(
    'INSERT INTO clients (name, phone, email) VALUES ($1, $2, $3) RETURNING *',
    [name, phone || null, email || null]
  );
  return rows[0];
}

async function updateClientNotes({ clientId, notes, medicalNotes }) {
  const fields = [];
  const values = [];
  let idx = 1;
  if (notes !== undefined)       { fields.push(`notes = $${idx++}`);        values.push(notes); }
  if (medicalNotes !== undefined) { fields.push(`medical_notes = $${idx++}`); values.push(medicalNotes); }
  if (!fields.length) throw new Error('Nothing to update');
  values.push(clientId);
  const { rows } = await db.query(
    `UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

const TOOL_DEFINITIONS = [
  {
    name: 'getClient',
    description: 'Look up a guest by their phone number.',
    input_schema: {
      type: 'object',
      properties: { phone: { type: 'string' } },
      required: ['phone'],
    },
  },
  {
    name: 'createClient',
    description: 'Create a new guest profile in the CRM.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'updateClientNotes',
    description: 'Update notes or medical notes for a guest.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string' },
        notes: { type: 'string' },
        medicalNotes: { type: 'string' },
      },
      required: ['clientId'],
    },
  },
];

module.exports = { getClient, createClient, updateClientNotes, TOOL_DEFINITIONS };
