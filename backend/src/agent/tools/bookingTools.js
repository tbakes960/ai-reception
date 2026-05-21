const db = require('../../services/db');

const WORKING_START = parseInt((process.env.WORKING_HOURS_START || '06:00').split(':')[0], 10);
const WORKING_END   = parseInt((process.env.WORKING_HOURS_END   || '22:00').split(':')[0], 10);
const DEFAULT_DURATION = 60;

function isWithinWorkingHours(time) {
  const hour = parseInt(time.split(':')[0], 10);
  return hour >= WORKING_START && hour < WORKING_END;
}

async function checkAvailability({ date, serviceType, time, tenantId }) {
  if (time && !isWithinWorkingHours(time)) {
    return { available: false, reason: `Outside working hours (${process.env.WORKING_HOURS_START}–${process.env.WORKING_HOURS_END})` };
  }

  let sql = `SELECT time, service, duration_minutes FROM bookings WHERE date = $1 AND status != 'cancelled'`;
  const params = [date];
  if (tenantId)    { sql += ` AND tenant_id = $${params.push(tenantId)}`; }
  if (serviceType) { sql += ` AND service = $${params.push(serviceType)}`; }
  if (time)        { sql += ` AND time = $${params.push(time)}`; }

  const { rows } = await db.query(sql, params);

  if (time && serviceType && rows.length > 0) {
    return { available: false, reason: 'That slot is already booked', existingBookings: rows };
  }
  return { available: true, existingBookings: rows };
}

async function createBooking({ clientId, date, time, service, durationMinutes, notes, tenantId }) {
  if (!isWithinWorkingHours(time)) throw new Error(`Booking time ${time} is outside working hours`);
  const avail = await checkAvailability({ date, serviceType: service, time, tenantId });
  if (!avail.available) throw new Error(avail.reason);

  const { rows } = await db.query(
    `INSERT INTO bookings (client_id, date, time, service, duration_minutes, notes, status, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7) RETURNING *`,
    [clientId, date, time, service, durationMinutes || DEFAULT_DURATION, notes || null, tenantId || null]
  );
  return rows[0];
}

async function updateBooking({ bookingId, changes }) {
  if (changes.time && !isWithinWorkingHours(changes.time)) throw new Error('New time is outside working hours');

  if (changes.date || changes.time || changes.service) {
    const current = await getBooking(bookingId);
    const avail = await checkAvailability({
      date: changes.date || current.date,
      serviceType: changes.service || current.service,
      time: changes.time || current.time,
    });
    if (!avail.available) throw new Error(avail.reason);
  }

  const allowed = ['date', 'time', 'service', 'status', 'notes', 'duration_minutes'];
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [key, val] of Object.entries(changes)) {
    if (allowed.includes(key)) { fields.push(`${key} = $${idx++}`); values.push(val); }
  }
  if (!fields.length) throw new Error('No valid fields to update');
  values.push(bookingId);
  const { rows } = await db.query(`UPDATE bookings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  return rows[0];
}

async function deleteBooking({ bookingId }) {
  const { rows } = await db.query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING *`, [bookingId]);
  return rows[0];
}

async function getBookings({ clientId }) {
  const { rows } = await db.query('SELECT * FROM bookings WHERE client_id = $1 ORDER BY date ASC', [clientId]);
  return rows;
}

async function getBooking(bookingId) {
  const { rows } = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  if (!rows[0]) throw new Error('Booking not found');
  return rows[0];
}

const TOOL_DEFINITIONS = [
  {
    name: 'checkAvailability',
    description: 'Check if a date/time/service slot is available.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD' },
        serviceType: { type: 'string' },
        time: { type: 'string', description: 'HH:MM 24h (optional)' },
      },
      required: ['date'],
    },
  },
  {
    name: 'createBooking',
    description: 'Create a confirmed booking after checking availability.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        service: { type: 'string' },
        durationMinutes: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['clientId', 'date', 'time', 'service'],
    },
  },
  {
    name: 'updateBooking',
    description: 'Update an existing booking.',
    input_schema: {
      type: 'object',
      properties: { bookingId: { type: 'string' }, changes: { type: 'object' } },
      required: ['bookingId', 'changes'],
    },
  },
  {
    name: 'deleteBooking',
    description: 'Cancel a booking.',
    input_schema: {
      type: 'object',
      properties: { bookingId: { type: 'string' } },
      required: ['bookingId'],
    },
  },
  {
    name: 'getBookings',
    description: 'Get all bookings for a client.',
    input_schema: {
      type: 'object',
      properties: { clientId: { type: 'string' } },
      required: ['clientId'],
    },
  },
];

module.exports = { checkAvailability, createBooking, updateBooking, deleteBooking, getBookings, TOOL_DEFINITIONS };
