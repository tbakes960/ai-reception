const REQUIRED = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ANTHROPIC_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_VOICE_ID',
  'DEEPGRAM_API_KEY',
  'SERVER_URL',
  'FRONTEND_URL',
  'HOTEL_NAME',
  'HOTEL_TIMEZONE',
];

const WARN_IF_MISSING = [
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_PLAN_ID',
  'OPENAI_API_KEY',
];

function validateEnv() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error('[startup] FATAL — Missing required env vars:', missing.join(', '));
    console.error('[startup] Copy configs/.env.example to configs/.env and fill in all values.');
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('[startup] FATAL — JWT_SECRET must be at least 32 characters.');
    process.exit(1);
  }

  // FRONTEND_URL must not be localhost in production
  if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL?.includes('localhost')) {
    console.error('[startup] FATAL — FRONTEND_URL cannot be localhost in production.');
    process.exit(1);
  }

  const warned = WARN_IF_MISSING.filter(k => !process.env[k]);
  if (warned.length > 0) {
    console.warn('[startup] WARNING — Optional vars not set (some features disabled):', warned.join(', '));
  }
}

module.exports = { validateEnv };
