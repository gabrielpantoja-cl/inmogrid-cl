-- Forum tables for Reddit-style threads + comments.
-- Run manually in the Supabase SQL editor after editing prisma/schema.prisma
-- and running `npm run prisma:generate`.
-- See CLAUDE.md → "Database Notes": no `prisma migrate`, no `db pull`.

-- 1. Enum for thread visibility.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ThreadStatus') THEN
    CREATE TYPE "ThreadStatus" AS ENUM ('published', 'hidden');
  END IF;
END$$;

-- 2. inmogrid_threads (forum threads).
CREATE TABLE IF NOT EXISTS inmogrid_threads (
  id            TEXT PRIMARY KEY,
  author_id     UUID NOT NULL REFERENCES inmogrid_profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  content_html  TEXT NOT NULL,
  content_text  TEXT NOT NULL,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  status        "ThreadStatus" NOT NULL DEFAULT 'published',
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_status_created
  ON inmogrid_threads (status, created_at DESC);

-- Full-text search index (Spanish).
CREATE INDEX IF NOT EXISTS idx_threads_search
  ON inmogrid_threads
  USING GIN (to_tsvector('spanish', title || ' ' || content_text));

-- 3. inmogrid_comments.
CREATE TABLE IF NOT EXISTS inmogrid_comments (
  id           TEXT PRIMARY KEY,
  thread_id    TEXT NOT NULL REFERENCES inmogrid_threads(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES inmogrid_profiles(id) ON DELETE CASCADE,
  content_html TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_thread_created
  ON inmogrid_comments (thread_id, created_at);
