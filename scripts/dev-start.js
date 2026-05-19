/**
 * Local development bootstrap.
 * Usage: node scripts/dev-start.js
 *
 * Checks required env vars are set before starting the server.
 * Extend this file when adding new required configuration.
 */

require('dotenv').config();

const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'PORT', 'NODE_ENV'];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('[dev-start] Missing required env vars:', missing.join(', '));
  console.error('[dev-start] Copy configs/.env.example to .env and fill in values.');
  process.exit(1);
}

console.log('[dev-start] Environment OK. Starting server on port', process.env.PORT);

// TODO (Phase 2): require('../src/input/server') when server is built
