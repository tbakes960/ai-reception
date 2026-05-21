const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { parseFile } = require('../services/documentParser');
const db = require('../services/db');

const router = express.Router();

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/octet-stream', // fallback — extension checked in documentParser
]);

const ALLOWED_EXTS = new Set(['pdf', 'docx', 'txt', 'md']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || '').split('.').pop().toLowerCase();
    if (ALLOWED_MIMES.has(file.mimetype) || ALLOWED_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Accepted: PDF, DOCX, TXT`));
    }
  },
});

router.use(requireAuth);

// ── GET /api/knowledge — list source documents for this tenant
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         source_id,
         source_file,
         COUNT(*)::int        AS chunk_count,
         MIN(created_at)      AS uploaded_at
       FROM knowledge_documents
       WHERE tenant_id = $1 AND source_id IS NOT NULL
       GROUP BY source_id, source_file
       ORDER BY MIN(created_at) DESC`,
      [req.tenantId]
    );
    res.json({ documents: rows });
  } catch {
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

// ── POST /api/knowledge/upload — process and embed a document
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'RAG embeddings unavailable — OPENAI_API_KEY not set' });
  }

  const sourceId = crypto.randomUUID();
  const sourceFile = req.file.originalname;

  try {
    const chunks = await parseFile(req.file);
    if (!chunks.length) {
      return res.status(422).json({ error: 'Could not extract any text from this file' });
    }

    let stored = 0;
    for (let i = 0; i < chunks.length; i++) {
      const title = `${sourceFile} — Part ${i + 1}`;
      const embedding = await embedText(chunks[i]);
      await db.query(
        `INSERT INTO knowledge_documents
           (title, content, embedding, tenant_id, source_id, source_file, chunk_index)
         VALUES ($1, $2, $3::vector, $4, $5, $6, $7)
         ON CONFLICT (title, tenant_id)
           DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding`,
        [
          title,
          chunks[i],
          embedding ? `[${embedding.join(',')}]` : null,
          req.tenantId,
          sourceId,
          sourceFile,
          i,
        ]
      );
      stored++;
    }

    res.json({ message: 'Document processed', sourceId, sourceFile, chunks: stored });
  } catch (err) {
    console.error('[knowledge] upload error:', err.message);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

// ── DELETE /api/knowledge/:sourceId — delete all chunks for a source file
router.delete('/:sourceId', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM knowledge_documents WHERE source_id = $1 AND tenant_id = $2',
      [req.params.sourceId, req.tenantId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Document deleted', chunksDeleted: rowCount });
  } catch {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

async function embedText(text) {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

module.exports = router;
