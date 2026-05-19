const { syncBookingToCalendar } = require('../../services/calendarService');

async function syncToCalendar({ bookingId }) {
  return syncBookingToCalendar(bookingId);
}

const TOOL_DEFINITIONS = [
  {
    name: 'syncToCalendar',
    description: 'Sync a confirmed booking to the hotel Google Calendar.',
    input_schema: {
      type: 'object',
      properties: {
        bookingId: { type: 'string' },
      },
      required: ['bookingId'],
    },
  },
];

module.exports = { syncToCalendar, TOOL_DEFINITIONS };
