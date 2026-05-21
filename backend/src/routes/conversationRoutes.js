const express = require('express');
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(requireAuth, apiLimiter);

const MAX_LIMIT = 100;
const VALID_SENTIMENTS  = ['positive', 'neutral', 'negative', 'frustrated'];
const VALID_DIRECTIONS  = ['inbound', 'outbound'];

router.get('/stats/summary', async (req, res) => {
  try {
    const today   = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [{ rows: todayRows }, { rows: totalRows }, { rows: sentimentRows }] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM conversations WHERE tenant_id = $1 AND created_at::date = $2`, [req.tenantId, today]),
      db.query(`SELECT COUNT(*) FROM conversations WHERE tenant_id = $1`, [req.tenantId]),
      db.query(`SELECT sentiment, COUNT(*) FROM conversations WHERE tenant_id = $1 AND created_at > $2 GROUP BY sentiment`, [req.tenantId, weekAgo]),
    ]);
    const sentimentBreakdown = sentimentRows.reduce((acc, r) => { acc[r.sentiment] = parseInt(r.count); return acc; }, {});
    res.json({
      todayCalls: parseInt(todayRows[0].count),
      totalCalls: parseInt(totalRows[0].count),
      sentimentBreakdown,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const sentiment = VALID_SENTIMENTS.includes(req.query.sentiment) ? req.query.sentiment : null;
    const direction = VALID_DIRECTIONS.includes(req.query.direction) ? req.query.direction : null;

    const conditions = ['conv.tenant_id = $1'];
    const params = [req.tenantId];
    let idx = 2;
    if (sentiment) { conditions.push(`conv.sentiment = $${idx++}`); params.push(sentiment); }
    if (direction) { conditions.push(`conv.direction = $${idx++}`); params.push(direction); }

    const where = conditions.join(' AND ');
    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      db.query(
        `SELECT conv.id, conv.call_sid, conv.direction, conv.summary, conv.sentiment, conv.duration_seconds, conv.created_at,
                c.name AS client_name, c.phone AS client_phone
         FROM conversations conv
         LEFT JOIN clients c ON c.id = conv.client_id AND c.tenant_id = conv.tenant_id
         WHERE ${where}
         ORDER BY conv.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM conversations conv WHERE ${where}`, params),
    ]);

    res.json({
      data: data.map(r => ({ ...r, client: r.client_name ? { name: r.client_name, phone: r.client_phone } : null })),
      total: parseInt(countRows[0].count),
      page,
      limit,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT conv.id, conv.call_sid, conv.direction, conv.transcript, conv.summary, conv.sentiment,
              conv.duration_seconds, conv.created_at,
              c.name AS client_name, c.phone AS client_phone, c.email AS client_email
       FROM conversations conv
       LEFT JOIN clients c ON c.id = conv.client_id AND c.tenant_id = conv.tenant_id
       WHERE conv.id = $1 AND conv.tenant_id = $2`,
      [req.params.id, req.tenantId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Conversation not found' });
    const row = rows[0];
    res.json({ ...row, client: row.client_name ? { name: row.client_name, phone: row.client_phone, email: row.client_email } : null });
  } catch {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

module.exports = router;
