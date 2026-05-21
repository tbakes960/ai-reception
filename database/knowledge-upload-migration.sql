-- ============================================================
-- Knowledge Documents — Upload Tracking
-- Run ONCE in Railway SQL Editor after saas-migration.sql
-- ============================================================

-- Add source tracking columns
ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS source_id    UUID,
  ADD COLUMN IF NOT EXISTS source_file  TEXT,
  ADD COLUMN IF NOT EXISTS chunk_index  INTEGER NOT NULL DEFAULT 0;

-- Drop the old global unique constraint on title
-- (title should be unique per-tenant, not globally)
ALTER TABLE knowledge_documents DROP CONSTRAINT IF EXISTS knowledge_documents_title_key;

-- New per-tenant unique index on title
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_title_tenant_idx
  ON knowledge_documents(title, tenant_id);

-- Index for fast lookup/delete by source_id
CREATE INDEX IF NOT EXISTS knowledge_source_id_idx
  ON knowledge_documents(source_id);
