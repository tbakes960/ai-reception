const express = require('express');
const twilio = require('twilio');
const { CallSession } = require('./callSession');
const { createDeepgramStream } = require('./deepgramSTT');
const { createElevenLabsStream } = require('./elevenLabsTTS');
const { createInterruptHandler } = require('./interruptHandler');
const { runAgentTurn } = require('../agent/claudeAgent');
const { getClient, createClient } = require('../agent/tools/crmTools');
const { saveConversation } = require('../services/conversationService');

const router = express.Router();

const FILLER_PHRASES = [
  "Let me check that for you…",
  "One moment please…",
  "Sure, let me look into that…",
  "Give me just a second…",
];

function randomFiller() {
  return FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)];
}

// ── TwiML webhook — Twilio calls this when a call arrives ──
router.post('/twiml', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const connect = twiml.connect();
  const wsUrl = `wss://${req.headers.host}/stream`;
  connect.stream({ url: wsUrl, track: 'inbound_track' });
  res.type('text/xml').send(twiml.toString());
});

// ── TwiML for outbound calls ──
router.post('/twiml/outbound', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const connect = twiml.connect();
  const wsUrl = `wss://${req.headers.host}/stream`;
  connect.stream({ url: wsUrl, track: 'inbound_track' });
  res.type('text/xml').send(twiml.toString());
});

// ── WebSocket handler — called by server.js for each /stream connection ──
async function handleMediaStream(ws, logger) {
  let session = null;
  let interruptHandler = null;

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.event) {
      case 'connected':
        logger.debug('Twilio WS connected handshake');
        break;

      case 'start': {
        const { streamSid, callSid, customParameters } = msg.start;
        const callerPhone = msg.start?.callAttributes?.to || customParameters?.callerPhone || 'unknown';

        session = new CallSession({ streamSid, callSid, callerPhone, ws, logger });

        // Start Deepgram STT
        const { connection: dgConn, emitter: sttEmitter } = createDeepgramStream(session);
        session.deepgramConn = dgConn;

        // Interrupt handler
        interruptHandler = createInterruptHandler({ session, sttEmitter, logger });

        // On final transcript → run agent turn
        sttEmitter.on('transcript', async (userText) => {
          if (!userText) return;
          session.interruptPending = false;
          session.appendMessage('user', userText);

          // Play filler while agent processes
          const fillerStream = createElevenLabsStream(session);
          fillerStream.sendText(randomFiller());
          fillerStream.flush();

          // Fetch client by phone
          if (!session.clientData) {
            session.clientData = await getClient(callerPhone).catch(() => null);
            if (!session.clientData && callerPhone !== 'unknown') {
              session.clientData = await createClient({ name: 'Guest', phone: callerPhone }).catch(() => null);
            }
          }

          // Run agent
          const ttsStream = createElevenLabsStream(session);
          session.elevenLabsStream = ttsStream;

          await runAgentTurn({
            session,
            onTextChunk: (chunk) => {
              fillerStream.close();
              ttsStream.sendText(chunk);
            },
            onDone: (assistantText) => {
              ttsStream.flush();
              session.appendMessage('assistant', assistantText);
            },
          });
        });

        // Greet the caller
        const greetStream = createElevenLabsStream(session);
        greetStream.sendText(
          `Thank you for calling ${process.env.HOTEL_NAME || 'the hotel'}. This is Sarah, how can I help you today?`
        );
        greetStream.flush();
        break;
      }

      case 'media': {
        if (!session?.deepgramConn) break;
        const audioBuffer = Buffer.from(msg.media.payload, 'base64');
        session.deepgramConn.send(audioBuffer);
        break;
      }

      case 'stop': {
        logger.info({ callSid: session?.callSid }, 'Call ended');
        if (session) {
          session.deepgramConn?.finish();
          session.elevenLabsStream?.close();
          interruptHandler?.destroy();
          await saveConversation(session).catch((err) =>
            logger.error({ err }, 'Failed to save conversation')
          );
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    logger.debug('Twilio WS closed');
    session?.deepgramConn?.finish();
    session?.elevenLabsStream?.close();
    interruptHandler?.destroy();
  });
}

module.exports = { router, handleMediaStream };
