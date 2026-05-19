const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../configs/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const pino = require('pino');

const { validateEnv } = require('./middleware/validateEnv');
const twilioRoutes = require('./routes/twilioRoutes');
const crmRoutes = require('./routes/crmRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const authRoutes = require('./routes/authRoutes');
const { handleMediaStream } = require('./voice/twilioHandler');
const { initOutboundScheduler } = require('./services/outboundCalling');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
});

validateEnv();

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:4000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'request');
  next();
});

app.use('/', twilioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clients', crmRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/campaigns', campaignRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Hotel AI Receptionist backend started');
  initOutboundScheduler(logger);
});

module.exports = { app, server };
