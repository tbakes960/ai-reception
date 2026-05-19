const twilio = require('twilio');

let _client;
function getTwilio() {
  if (!_client) _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return _client;
}

async function sendSMSMessage(to, body) {
  const msg = await getTwilio().messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
    body,
  });
  return { sid: msg.sid, status: msg.status };
}

module.exports = { sendSMSMessage };
