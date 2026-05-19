const REQUIRED = [
  'DATABASE_URL',
  'ANTHROPIC_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_VOICE_ID',
  'DEEPGRAM_API_KEY',
  'JWT_SECRET',
];

function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('[startup] Missing required env vars:', missing.join(', '));
    console.error('[startup] Copy configs/.env.example to configs/.env and fill in values.');
    process.exit(1);
  }
}

module.exports = { validateEnv };
