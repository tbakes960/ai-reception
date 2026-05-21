#!/usr/bin/env node
/**
 * One-time admin setup. Run once per tenant after deployment.
 * Usage: node scripts/create-admin.js <email> <tenantId>
 * The generated password is printed ONCE — store it securely.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../configs/.env') });

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Pool } = require('pg');

const [,, email, tenantId] = process.argv;
if (!email || !tenantId) {
  console.error('Usage: node scripts/create-admin.js <email> <tenantId>');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const password = crypto.randomBytes(16).toString('base64url');
  const hash = await bcrypt.hash(password, 12);

  const { rows } = await pool.query(
    `INSERT INTO users (tenant_id, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = $3
     RETURNING id, email, role`,
    [tenantId, email, hash]
  );

  console.log('\n✓ Admin user created');
  console.log('  Email:    ', rows[0].email);
  console.log('  Password: ', password);
  console.log('  User ID:  ', rows[0].id);
  console.log('\nStore this password securely — it will not be shown again.\n');
  await pool.end();
})().catch(err => { console.error(err.message); pool.end(); process.exit(1); });
