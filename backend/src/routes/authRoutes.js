const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../services/db');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/login',
  authLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isString().isLength({ min: 1, max: 128 }).withMessage('Password required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid credentials' });

    const { email, password } = req.body;

    try {
      const { rows } = await db.query(
        'SELECT id, email, role, password_hash, tenant_id FROM users WHERE email = $1',
        [email]
      );
      const user = rows[0];

      // Use constant-time comparison even for missing user (prevent timing attacks)
      const dummyHash = '$2b$12$invalidhashfortimingattackprevention000000000000000000';
      const valid = user
        ? await bcrypt.compare(password, user.password_hash)
        : await bcrypt.compare(password, dummyHash).then(() => false);

      if (!user || !valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, tenantId: user.tenant_id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch {
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

module.exports = router;
