const { google } = require('googleapis');
const db = require('./db');

function getCalendarClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

async function syncBookingToCalendar(bookingId) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_CALENDAR_ID) {
    return { skipped: true, reason: 'Google Calendar not configured' };
  }

  const { rows } = await db.query(
    `SELECT b.*, c.name AS client_name, c.email AS client_email
     FROM bookings b
     LEFT JOIN clients c ON c.id = b.client_id
     WHERE b.id = $1`,
    [bookingId]
  );
  const booking = rows[0];
  if (!booking) throw new Error('Booking not found');

  const calendar = getCalendarClient();
  const startDateTime = `${booking.date}T${booking.time}:00`;
  const endDate = new Date(`${booking.date}T${booking.time}:00`);
  endDate.setMinutes(endDate.getMinutes() + (booking.duration_minutes || 60));

  const event = {
    summary: `${booking.service} — ${booking.client_name || 'Guest'}`,
    description: `Booking ID: ${bookingId}\nClient: ${booking.client_name}`,
    start: { dateTime: startDateTime, timeZone: process.env.HOTEL_TIMEZONE || 'Africa/Nairobi' },
    end:   { dateTime: endDate.toISOString(), timeZone: process.env.HOTEL_TIMEZONE || 'Africa/Nairobi' },
    attendees: booking.client_email ? [{ email: booking.client_email }] : [],
  };

  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    resource: event,
    sendUpdates: 'all',
  });

  return { eventId: response.data.id, htmlLink: response.data.htmlLink };
}

module.exports = { syncBookingToCalendar };
