const WebSocket = require('ws');

const ELEVENLABS_WS_URL = (voiceId) =>
  `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_turbo_v2&output_format=ulaw_8000`;

/**
 * Opens an ElevenLabs streaming TTS WebSocket.
 * Returns { sendText, close }.
 * Audio chunks are sent directly to Twilio via session.sendAudioToTwilio().
 */
function createElevenLabsStream(session) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const ws = new WebSocket(ELEVENLABS_WS_URL(voiceId), {
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
  });

  let ready = false;
  const queue = [];

  ws.on('open', () => {
    ready = true;
    ws.send(JSON.stringify({
      text: ' ',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        speed: 1.0,
      },
      generation_config: {
        chunk_length_schedule: [50, 120, 200],
      },
    }));
    session.logger.info({ callSid: session.callSid }, 'ElevenLabs TTS connected');
    session.isPlaying = true;
    queue.forEach((t) => _send(t));
    queue.length = 0;
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.audio) {
        session.sendAudioToTwilio(msg.audio);
      }
      if (msg.isFinal) {
        session.isPlaying = false;
        session.logger.debug({ callSid: session.callSid }, 'TTS stream finished');
      }
    } catch (_) { /* binary frames are ignored */ }
  });

  ws.on('error', (err) => {
    session.logger.error({ err }, 'ElevenLabs TTS error');
    session.isPlaying = false;
  });

  ws.on('close', () => {
    session.isPlaying = false;
  });

  function _send(text) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ text, flush: false }));
    }
  }

  function sendText(text) {
    if (!ready) { queue.push(text); return; }
    _send(text);
  }

  function flush() {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ text: '', flush: true }));
    }
  }

  function close() {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    session.isPlaying = false;
  }

  return { sendText, flush, close };
}

module.exports = { createElevenLabsStream };
