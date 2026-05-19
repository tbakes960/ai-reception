const db = require('./db');

async function embedText(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });

  if (!response.ok) {
    console.warn('[rag] Embedding API unavailable — skipping RAG');
    return null;
  }

  const data = await response.json();
  return data.data?.[0]?.embedding || null;
}

async function getContext(query) {
  if (!query || !process.env.OPENAI_API_KEY) return '';

  try {
    const embedding = await embedText(query);
    if (!embedding) return '';

    // pgvector cosine similarity search
    const { rows } = await db.query(
      `SELECT title, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM knowledge_documents
       WHERE 1 - (embedding <=> $1::vector) > 0.6
       ORDER BY embedding <=> $1::vector
       LIMIT 3`,
      [`[${embedding.join(',')}]`]
    );

    if (!rows.length) return '';
    return rows.map((r) => `## ${r.title}\n${r.content}`).join('\n\n');
  } catch (err) {
    console.error('[rag] getContext error:', err.message);
    return '';
  }
}

async function upsertDocument({ title, content }) {
  const embedding = await embedText(content);

  const { rows } = await db.query(
    `INSERT INTO knowledge_documents (title, content, embedding)
     VALUES ($1, $2, $3::vector)
     ON CONFLICT (title) DO UPDATE
       SET content = EXCLUDED.content, embedding = EXCLUDED.embedding
     RETURNING *`,
    [title, content, embedding ? `[${embedding.join(',')}]` : null]
  );
  return rows[0];
}

module.exports = { getContext, upsertDocument };
