/**
 * Per-call state container.
 * One instance created when a Twilio Media Stream WebSocket connects.
 */
class CallSession {
  constructor({ streamSid, callSid, callerPhone, ws, logger }) {
    this.streamSid = streamSid;
    this.callSid = callSid;
    this.callerPhone = callerPhone;
    this.ws = ws;
    this.logger = logger;

    this.conversationHistory = [];
    this.clientData = null;

    this.isPlaying = false;
    this.isListening = true;

    this.deepgramConn = null;
    this.elevenLabsStream = null;

    this.fillerPlayed = false;
    this.currentTurnStarted = null;
    this.interruptPending = false;
  }

  appendMessage(role, content) {
    this.conversationHistory.push({ role, content });
  }

  sendAudioToTwilio(audioBase64) {
    if (this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({
      event: 'media',
      streamSid: this.streamSid,
      media: { payload: audioBase64 },
    }));
  }

  clearTwilioBuffer() {
    if (this.ws.readyState !== 1) return;
    this.ws.send(JSON.stringify({
      event: 'clear',
      streamSid: this.streamSid,
    }));
  }
}

module.exports = { CallSession };
