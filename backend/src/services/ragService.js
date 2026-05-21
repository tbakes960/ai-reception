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

async function getContext(query, tenantId) {
  if (!query || !process.env.OPENAI_API_KEY) return '';

  try {
    const embedding = await embedText(query);
    if (!embedding) return '';

    const params = [`[${embedding.join(',')}]`];
    const tenantClause = tenantId ? ` AND tenant_id = $${params.push(tenantId)}` : '';

    const { rows } = await db.query(
      `SELECT title, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM knowledge_documents
       WHERE 1 - (embedding <=> $1::vector) > 0.6${tenantClause}
       ORDER BY embedding <=> $1::vector
       LIMIT 3`,
      params
    );

    if (!rows.length) return '';
    return rows.map((r) => `## ${r.title}\n${r.content}`).join('\n\n');
  } catch (err) {
    console.error('[rag] getContext error:', err.message);
    return '';
  }
}

async function upsertDocument({ title, content, tenantId }) {
  const embedding = await embedText(content);

  const { rows } = await db.query(
    `INSERT INTO knowledge_documents (title, content, embedding, tenant_id)
     VALUES ($1, $2, $3::vector, $4)
     ON CONFLICT (title, tenant_id) DO UPDATE
       SET content = EXCLUDED.content, embedding = EXCLUDED.embedding
     RETURNING *`,
    [title, content, embedding ? `[${embedding.join(',')}]` : null, tenantId || null]
  );
  return rows[0];
}

module.exports = { getContext, upsertDocument };
