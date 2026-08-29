/**
 * Canonical schema for the local MVP.
 *
 * Every statement is idempotent, so `applySchema` doubles as the migration for
 * a fresh database and a no-op on an existing one. When this moves to Supabase
 * the tables translate one-to-one; only the repository implementations change.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS competitors (
  id                  TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  instagram_username  TEXT NOT NULL UNIQUE,
  profile_url         TEXT NOT NULL,
  country             TEXT NOT NULL CHECK (country IN ('IL', 'US', 'OTHER')),
  niche               TEXT NOT NULL DEFAULT '',
  relevance_note      TEXT NOT NULL DEFAULT '',
  tags                TEXT NOT NULL DEFAULT '[]',
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reels (
  id                TEXT PRIMARY KEY,
  competitor_id     TEXT NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  source_url        TEXT NOT NULL,
  short_code        TEXT NOT NULL,
  caption           TEXT,
  published_at      TEXT,
  duration_seconds  REAL,
  language          TEXT,
  transcript        TEXT,
  owner_username    TEXT,
  thumbnail_url     TEXT,
  remote_video_url  TEXT,
  tags              TEXT NOT NULL DEFAULT '[]',
  import_source     TEXT NOT NULL CHECK (import_source IN ('apify-json-manual', 'apify-api', 'demo-fixture')),
  imported_at       TEXT NOT NULL,
  raw_payload       TEXT NOT NULL DEFAULT '{}',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE (competitor_id, short_code)
);

CREATE INDEX IF NOT EXISTS idx_reels_competitor ON reels(competitor_id);
CREATE INDEX IF NOT EXISTS idx_reels_published ON reels(published_at);

CREATE TABLE IF NOT EXISTS reel_metrics (
  id              TEXT PRIMARY KEY,
  reel_id         TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  play_count      INTEGER,
  likes_count     INTEGER,
  comments_count  INTEGER,
  captured_at     TEXT NOT NULL,
  source          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metrics_reel ON reel_metrics(reel_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS reel_media (
  id                 TEXT PRIMARY KEY,
  reel_id            TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  kind               TEXT NOT NULL CHECK (kind IN ('video', 'thumbnail')),
  storage_key        TEXT NOT NULL,
  original_filename  TEXT,
  mime_type          TEXT NOT NULL,
  byte_size          INTEGER NOT NULL,
  created_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_reel ON reel_media(reel_id, kind);

CREATE TABLE IF NOT EXISTS reel_analyses (
  id              TEXT PRIMARY KEY,
  reel_id         TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  prompt_version  TEXT NOT NULL,
  transcript_ref  TEXT,
  language        TEXT,
  provider        TEXT NOT NULL,
  model           TEXT,
  run_mode        TEXT NOT NULL CHECK (run_mode IN ('live', 'fixture')),
  analysed_at     TEXT NOT NULL,
  payload         TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analyses_reel ON reel_analyses(reel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reel_comparisons (
  id             TEXT PRIMARY KEY,
  reel_a_id      TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  reel_b_id      TEXT NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  comparability  TEXT NOT NULL,
  notes          TEXT,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pattern_cards (
  id                    TEXT PRIMARY KEY,
  comparison_id         TEXT REFERENCES reel_comparisons(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  when_useful           TEXT NOT NULL DEFAULT '',
  supporting_reel_ids   TEXT NOT NULL DEFAULT '[]',
  counterexamples       TEXT NOT NULL DEFAULT '',
  evidence_count        INTEGER NOT NULL DEFAULT 0,
  confidence            TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  baderech_translation  TEXT NOT NULL DEFAULT '',
  do_not_copy_note      TEXT NOT NULL DEFAULT '',
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patterns_created ON pattern_cards(created_at DESC);
`;
