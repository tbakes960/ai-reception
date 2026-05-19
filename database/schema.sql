-- ============================================================
-- Hotel AI Voice Receptionist — Railway PostgreSQL Schema
-- Run via: psql $DATABASE_URL -f schema.sql
-- Or paste into Railway's query console
-- ============================================================

-- Enable pgvector for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (Admin/Staff logins)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTS (Guests)
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                    TEXT NOT NULL,
  phone                   TEXT UNIQUE,
  email                   TEXT,
  notes                   TEXT,
  medical_notes           TEXT,
  last_stay_date          DATE,
  contact_consent         BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_contact_method TEXT DEFAULT 'phone'
    CHECK (preferred_contact_method IN ('phone', 'sms', 'whatsapp', 'email')),
  last_contacted_at       TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clients_phone_idx   ON clients(phone);
CREATE INDEX IF NOT EXISTS clients_consent_idx ON clients(contact_consent);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  time             TIME NOT NULL,
  service          TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status           TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_date_idx   ON bookings(date);
CREATE INDEX IF NOT EXISTS bookings_client_idx ON bookings(client_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);

-- Prevent double-bookings on same date/time/service
CREATE UNIQUE INDEX IF NOT EXISTS bookings_no_double_idx
  ON bookings(date, time, service)
  WHERE status NOT IN ('cancelled');

-- ============================================================
-- CONVERSATIONS (Call transcripts)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID REFERENCES clients(id) ON DELETE SET NULL,
  call_sid         TEXT UNIQUE,
  direction        TEXT NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'outbound')),
  transcript       JSONB NOT NULL DEFAULT '[]',
  summary          TEXT,
  sentiment        TEXT DEFAULT 'neutral'
    CHECK (sentiment IN ('positive', 'neutral', 'negative', 'frustrated')),
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_client_idx  ON conversations(client_id);
CREATE INDEX IF NOT EXISTS conversations_created_idx ON conversations(created_at DESC);

-- ============================================================
-- KNOWLEDGE DOCUMENTS (RAG / pgvector)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL UNIQUE,
  content    TEXT NOT NULL,
  embedding  vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_embedding_idx
  ON knowledge_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  issue           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CAMPAIGNS (Outbound call campaigns)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  type              TEXT NOT NULL
    CHECK (type IN ('follow_up', 're_engagement', 'promotion')),
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed')),
  trigger_days_after INTEGER,
  max_calls_per_day  INTEGER NOT NULL DEFAULT 20,
  script_template    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CAMPAIGN CALLS (Individual outbound call queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_calls (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'calling', 'completed', 'failed', 'opted_out')),
  call_sid     TEXT,
  scheduled_at TIMESTAMPTZ,
  called_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, client_id)
);

CREATE INDEX IF NOT EXISTS campaign_calls_status_idx   ON campaign_calls(status);
CREATE INDEX IF NOT EXISTS campaign_calls_campaign_idx ON campaign_calls(campaign_id);

-- ============================================================
-- SEED: Default admin user
-- Password: admin123  (bcrypt hash — change immediately after first login)
-- ============================================================
INSERT INTO users (email, password_hash, role)
VALUES ('admin@hotel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8OFAs.oFnHXnubO', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- SEED: Default campaigns
-- ============================================================
INSERT INTO campaigns (name, type, trigger_days_after, max_calls_per_day)
VALUES
  ('Post-Stay Follow Up', 'follow_up', 2, 30),
  ('90-Day Re-Engagement', 're_engagement', 90, 20)
ON CONFLICT DO NOTHING;
