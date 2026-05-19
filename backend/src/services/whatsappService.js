const twilio = require('twilio');

let _client;
function getTwilio() {
  if (!_client) _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return _client;
}

async function sendWhatsAppMessage(to, body) {
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const msg = await getTwilio().messages.create({ from, to: toWa, body });
  return { sid: msg.sid, status: msg.status };
}

module.exports = { sendWhatsAppMessage };
