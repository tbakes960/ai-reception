const db = require('./db');

function detectSentiment(history) {
  const text = history.map((m) => m.content).join(' ').toLowerCase();
  if (/frustrat|angry|terrible|awful|worst|horrible/.test(text)) return 'frustrated';
  if (/unhappy|disappoint|bad|poor|slow|wrong/.test(text))        return 'negative';
  if (/great|wonderful|excellent|love|perfect|amazing|thank/.test(text)) return 'positive';
  return 'neutral';
}

async function saveConversation(session) {
  const { conversationHistory, callSid, clientData, streamSid } = session;
  if (!conversationHistory.length) return;

  const sentiment = detectSentiment(conversationHistory);
  const lastUser  = conversationHistory.filter((m) => m.role === 'user').at(-1)?.content || '';
  const summary   = lastUser.slice(0, 200);

  const { rows } = await db.query(
    `INSERT INTO conversations (client_id, call_sid, direction, transcript, summary, sentiment)
     VALUES ($1, $2, 'inbound', $3, $4, $5)
     ON CONFLICT (call_sid) DO UPDATE
       SET transcript = EXCLUDED.transcript, summary = EXCLUDED.summary, sentiment = EXCLUDED.sentiment
     RETURNING *`,
    [
      clientData?.id || null,
      callSid || streamSid,
      JSON.stringify(conversationHistory),
      summary,
      sentiment,
    ]
  );

  if (clientData?.id) {
    await db.query(
      'UPDATE clients SET last_contacted_at = NOW() WHERE id = $1',
      [clientData.id]
    );
  }

  return rows[0];
}

module.exports = { saveConversation };
