const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../configs/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { WebSocketServer } = require('ws');
const pino = require('pino');

const { validateEnv } = require('./middleware/validateEnv');
const twilioRoutes = require('./routes/twilioRoutes');
const crmRoutes = require('./routes/crmRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const { handleMediaStream } = require('./voice/twilioHandler');
const { initOutboundScheduler } = require('./services/outboundCalling');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
});

validateEnv();

const app = express();

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: [
        "'self'",
        'https://api.twilio.com',
        'https://*.twilio.com',
        'wss://*.twilio.com',
        'https://api.elevenlabs.io',
        'wss://api.elevenlabs.io',
        'https://api.deepgram.com',
        'wss://*.deepgram.com',
        'https://api.anthropic.com',
        'https://api-m.paypal.com',
        'https://api-m.sandbox.paypal.com',
      ],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'request');
  next();
});

app.use('/', twilioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/clients', crmRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/knowledge', knowledgeRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.get('/ready', async (_req, res) => {
  try {
    const db = require('./services/db');
    await db.query('SELECT 1');
    res.json({ status: 'ready', db: 'connected', ts: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', db: 'disconnected', ts: new Date().toISOString() });
  }
});

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, _req, res, _next) => {
  logger.error(err, 'unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/stream' });
wss.on('connection', (ws, req) => {
  logger.info({ url: req.url }, 'WebSocket connected');
  handleMediaStream(ws, logger);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Rehema AI backend started');
  initOutboundScheduler(logger);
});

function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force exit if graceful close takes too long
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server };
