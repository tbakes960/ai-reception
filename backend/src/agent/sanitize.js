/**
 * Strip prompt-injection patterns from speech-to-text transcripts.
 * Callers may attempt to override AI behaviour by saying phrases like
 * "ignore previous instructions". This runs before any transcript reaches Claude.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|context)/gi,
  /forget\s+(everything|all|your\s+instructions?)/gi,
  /you\s+are\s+now\s+(a\s+)?(?!sarah|the\s+receptionist)/gi,
  /act\s+as\s+(a\s+)?(?!hotel|receptionist|sarah)/gi,
  /new\s+(system\s+)?prompt\s*:/gi,
  /\[SYSTEM\]/gi,
  /\[INST\]/gi,
  /<\/?s>/gi,
  /###\s*(instruction|system|prompt)/gi,
  /jailbreak/gi,
  /DAN\s+mode/gi,
];

const MAX_TRANSCRIPT_LENGTH = 1000;

/**
 * @param {string} transcript - raw STT transcript
 * @returns {string} sanitized text safe to send to Claude
 */
function sanitizeTranscript(transcript) {
  if (typeof transcript !== 'string') return '';

  let text = transcript.slice(0, MAX_TRANSCRIPT_LENGTH);

  for (const pattern of INJECTION_PATTERNS) {
    text = text.replace(pattern, '[unclear]');
  }

  return text.trim();
}

module.exports = { sanitizeTranscript };
