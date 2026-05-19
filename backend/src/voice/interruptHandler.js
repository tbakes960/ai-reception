/**
 * Interrupt / barge-in handler.
 * Watches for STT speech events during AI playback and cuts the TTS stream.
 */

const DEBOUNCE_MS = 200;

function createInterruptHandler({ session, sttEmitter, logger }) {
  let debounceTimer = null;

  function onSpeechStarted() {
    if (!session.isPlaying) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      logger.info({ callSid: session.callSid }, 'Interrupt detected — stopping TTS');

      if (session.elevenLabsStream) {
        session.elevenLabsStream.close();
        session.elevenLabsStream = null;
      }
      session.clearTwilioBuffer();
      session.isPlaying = false;
      session.interruptPending = true;
    }, DEBOUNCE_MS);
  }

  sttEmitter.on('speechStarted', onSpeechStarted);

  function destroy() {
    sttEmitter.off('speechStarted', onSpeechStarted);
    clearTimeout(debounceTimer);
  }

  return { destroy };
}

module.exports = { createInterruptHandler };
