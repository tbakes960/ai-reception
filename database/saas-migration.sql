-- ============================================================
-- SaaS Migration — Multi-tenancy + Subscriptions
-- Run ONCE against Railway DB after schema.sql
-- ============================================================

-- ============================================================
-- TENANTS (one row per hotel/business)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,         -- URL-safe identifier
  owner_email       TEXT NOT NULL UNIQUE,
  hotel_name        TEXT NOT NULL,
  hotel_timezone    TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  twilio_phone      TEXT,                          -- their Twilio number
  elevenlabs_voice_id TEXT DEFAULT '21m00Tcm4TlvDq8ikWAM',
  working_hours_start TEXT DEFAULT '06:00',
  working_hours_end   TEXT DEFAULT '22:00',
  plan              TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
  status            TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial','active','suspended','cancelled')),
  trial_ends_at     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tenants_slug_idx  ON tenants(slug);
CREATE INDEX IF NOT EXISTS tenants_owner_idx ON tenants(owner_email);

-- ============================================================
-- SUBSCRIPTIONS (PayPal billing records)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  paypal_subscription_id  TEXT UNIQUE,
  paypal_plan_id          TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','suspended','cancelled')),
  amount_usd              NUMERIC(8,2) NOT NULL DEFAULT 29.00,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_tenant_idx  ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS subscriptions_paypal_idx  ON subscriptions(paypal_subscription_id);

-- ============================================================
-- ADD tenant_id TO ALL EXISTING TABLES
-- ============================================================

-- Create a system tenant for existing single-hotel data
INSERT INTO tenants (name, slug, owner_email, hotel_name, plan, status)
VALUES ('Oyugis Le Grand Hotel', 'oyugis', 'tabekah@yahoo.co.uk', 'Oyugis Le Grand Hotel', 'starter', 'active')
ON CONFLICT (slug) DO NOTHING;

-- Add tenant_id columns
ALTER TABLE users            ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE clients          ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE bookings         ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE conversations    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE campaigns        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE campaign_calls   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE support_tickets  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Backfill existing rows with the system tenant
DO $$
DECLARE sys_tenant_id UUID;
BEGIN
  SELECT id INTO sys_tenant_id FROM tenants WHERE slug = 'oyugis';
  UPDATE users             SET tenant_id = sys_tenant_id WHERE tenant_id IS NULL;
  UPDATE clients           SET tenant_id = sys_tenant_id WHERE tenant_id IS NULL;
  UPDATE bookings          SET tenant_id = sys_tenant_id WHERE tenant_id IS NULL;
  UPDATE conversations     SET tenant_id = sys_tenant_id WHERE tenant_id IS NULL;
  UPDATE campaigns         SET tenant_id = sys_tenant_id WHERE tenant_id IS NULL;
  UPDATE campaign_calls    SET tenant_id = sys_tenant_id WHERE tenant_id IS NULL;
  UPDATE support_tickets   SET tenant_id = sys_tenant_id WHERE tenant_id IS NULL;
  UPDATE knowledge_documents SET tenant_id = sys_tenant_id WHERE tenant_id IS NULL;
END $$;

-- Make tenant_id NOT NULL after backfill
ALTER TABLE users              ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE clients            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE bookings           ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE conversations      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE campaigns          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE campaign_calls     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE support_tickets    ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE knowledge_documents ALTER COLUMN tenant_id SET NOT NULL;

-- Fix unique constraint on clients.phone to be per-tenant
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS clients_phone_tenant_idx ON clients(phone, tenant_id);

-- Indexes
CREATE INDEX IF NOT EXISTS users_tenant_idx               ON users(tenant_id);
CREATE INDEX IF NOT EXISTS clients_tenant_idx             ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS bookings_tenant_idx            ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS conversations_tenant_idx       ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS campaigns_tenant_idx           ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS knowledge_documents_tenant_idx ON knowledge_documents(tenant_id);

-- ============================================================
-- SEED: system subscription for Oyugis tenant
-- ============================================================
INSERT INTO subscriptions (tenant_id, status, amount_usd)
SELECT id, 'active', 29.00 FROM tenants WHERE slug = 'oyugis'
ON CONFLICT DO NOTHING;
