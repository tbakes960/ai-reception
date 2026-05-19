const express = require('express');
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(requireAuth, apiLimiter);

router.get('/stats/summary', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [{ rows: todayRows }, { rows: totalRows }, { rows: sentimentRows }] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM conversations WHERE created_at::date = $1`, [today]),
      db.query(`SELECT COUNT(*) FROM conversations`),
      db.query(`SELECT sentiment, COUNT(*) FROM conversations WHERE created_at > $1 GROUP BY sentiment`, [weekAgo]),
    ]);
    const sentimentBreakdown = sentimentRows.reduce((acc, r) => { acc[r.sentiment] = parseInt(r.count); return acc; }, {});
    res.json({
      todayCalls: parseInt(todayRows[0].count),
      totalCalls: parseInt(totalRows[0].count),
      sentimentBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sentiment, direction } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let idx = 1;
    if (sentiment)  { conditions.push(`conv.sentiment = $${idx++}`);  params.push(sentiment); }
    if (direction)  { conditions.push(`conv.direction = $${idx++}`);  params.push(direction); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [{ rows: data }, { rows: countRows }] = await Promise.all([
      db.query(
        `SELECT conv.id, conv.call_sid, conv.direction, conv.summary, conv.sentiment, conv.duration_seconds, conv.created_at,
                c.name AS client_name, c.phone AS client_phone
         FROM conversations conv
         LEFT JOIN clients c ON c.id = conv.client_id
         ${where}
         ORDER BY conv.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, parseInt(limit), offset]
      ),
      db.query(`SELECT COUNT(*) FROM conversations ${where}`, params.slice(0, conditions.length)),
    ]);

    res.json({
      data: data.map((r) => ({ ...r, clients: r.client_name ? { name: r.client_name, phone: r.client_phone } : null })),
      total: parseInt(countRows[0].count),
      page: parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT conv.*, c.name AS client_name, c.phone AS client_phone, c.email AS client_email
       FROM conversations conv
       LEFT JOIN clients c ON c.id = conv.client_id
       WHERE conv.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Conversation not found' });
    const row = rows[0];
    res.json({ ...row, clients: row.client_name ? { name: row.client_name, phone: row.client_phone, email: row.client_email } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
