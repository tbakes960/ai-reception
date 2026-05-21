/**
 * Seed hotel knowledge documents into the Railway PostgreSQL vector store.
 * Usage: node scripts/seed-knowledge.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../configs/.env') });
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

async function embedText(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);
  const data = await response.json();
  return data.data[0].embedding;
}

function chunkMarkdown(content) {
  return content
    .split(/^## /m)
    .filter(Boolean)
    .map((section) => {
      const lines = section.trim().split('\n');
      return { title: lines[0].trim(), content: lines.slice(1).join('\n').trim() };
    })
    .filter((s) => s.content.length > 20);
}

async function main() {
  const tenantSlug = process.argv[2] || 'oyugis';

  // Resolve tenant UUID — required because knowledge_documents.tenant_id is NOT NULL
  const tenantRes = await pool.query('SELECT id FROM tenants WHERE slug = $1', [tenantSlug]);
  if (!tenantRes.rows[0]) {
    console.error(`Tenant '${tenantSlug}' not found in DB. Run the SaaS migration first.`);
    process.exit(1);
  }
  const tenantId = tenantRes.rows[0].id;
  console.log(`Seeding for tenant '${tenantSlug}' (${tenantId})\n`);

  const faqPath = path.join(__dirname, '../knowledge/hotel-faqs.md');
  if (!fs.existsSync(faqPath)) { console.error('knowledge/hotel-faqs.md not found'); process.exit(1); }

  const chunks = chunkMarkdown(fs.readFileSync(faqPath, 'utf8'));
  console.log(`Seeding ${chunks.length} knowledge chunks…\n`);

  for (const chunk of chunks) {
    process.stdout.write(`  ${chunk.title}… `);
    const embedding = await embedText(`${chunk.title}\n${chunk.content}`);
    await pool.query(
      `INSERT INTO knowledge_documents (title, content, embedding, tenant_id)
       VALUES ($1, $2, $3::vector, $4)
       ON CONFLICT (title, tenant_id) DO UPDATE
         SET content = EXCLUDED.content, embedding = EXCLUDED.embedding`,
      [chunk.title, chunk.content, `[${embedding.join(',')}]`, tenantId]
    );
    console.log('OK');
  }

  console.log('\nKnowledge base seeded successfully.');
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
