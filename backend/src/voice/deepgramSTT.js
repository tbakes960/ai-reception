const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const { EventEmitter } = require('events');

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

/**
 * Opens a Deepgram streaming STT connection for one call session.
 * Emits: 'transcript' (final text), 'interim' (partial text), 'speechStarted'
 */
function createDeepgramStream(session) {
  const emitter = new EventEmitter();

  const connection = deepgram.listen.live({
    model: 'nova-3-general',
    encoding: 'mulaw',
    sample_rate: 8000,
    channels: 1,
    interim_results: true,
    endpointing: 300,
    smart_format: true,
    utterance_end_ms: 1000,
  });

  connection.on(LiveTranscriptionEvents.Open, () => {
    session.logger.info({ callSid: session.callSid }, 'Deepgram STT connected');
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data?.channel?.alternatives?.[0];
    if (!alt) return;

    const text = alt.transcript?.trim();
    if (!text) return;

    if (data.is_final) {
      session.logger.info({ text }, 'STT final transcript');
      emitter.emit('transcript', text);
    } else {
      emitter.emit('interim', text);
    }
  });

  connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
    emitter.emit('speechStarted');
  });

  connection.on(LiveTranscriptionEvents.Error, (err) => {
    session.logger.error({ err }, 'Deepgram STT error');
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    session.logger.info({ callSid: session.callSid }, 'Deepgram STT closed');
  });

  return { connection, emitter };
}

module.exports = { createDeepgramStream };
