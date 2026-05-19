const twilio = require('twilio');

function validateTwilioSignature(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const signature = req.headers['x-twilio-signature'];

  const valid = twilio.validateRequest(authToken, signature, url, req.body);
  if (!valid) return res.status(403).send('Invalid Twilio signature');
  next();
}

module.exports = { validateTwilioSignature };
