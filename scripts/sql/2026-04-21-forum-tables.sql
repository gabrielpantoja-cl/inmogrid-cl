-- ============================================================
-- Forum tables migration — apply manually in Supabase SQL Editor
-- (project ref in CLAUDE.local.md, not committed here)
-- Generated from prisma/schema.prisma on 2026-04-21
-- ============================================================
--
-- Context: commit 6db60bd0 (feat/foro Reddit-style forum) added the
-- ForumThread and ForumComment models to the Prisma schema but the SQL
-- migration was never executed in production Supabase. As a result the
-- endpoint POST /api/threads returns 500 because it tries to INSERT into
-- tables that don't exist.
--
-- This script creates the enum ThreadStatus, the tables threads and
-- comments, their indexes and foreign keys. It uses IF NOT EXISTS where
-- possible so re-running is safe.
-- ============================================================

BEGIN;

-- 1. Enum
DO $$ BEGIN
  CREATE TYPE "ThreadStatus" AS ENUM ('published', 'hidden');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tables
CREATE TABLE IF NOT EXISTS "threads" (
    "id" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content_html" TEXT NOT NULL,
    "content_text" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ThreadStatus" NOT NULL DEFAULT 'published',
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "comments" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "content_html" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- 3. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "threads_slug_key" ON "threads"("slug");
CREATE INDEX IF NOT EXISTS "threads_status_created_at_idx" ON "threads"("status", "created_at");
CREATE INDEX IF NOT EXISTS "threads_slug_idx" ON "threads"("slug");
CREATE INDEX IF NOT EXISTS "comments_thread_id_created_at_idx" ON "comments"("thread_id", "created_at");

-- 4. Foreign keys (guarded — drop if exists then recreate, to avoid
-- leaving constraints pointing to stale references if the script is
-- re-run after a partial failure)
DO $$ BEGIN
  ALTER TABLE "threads"
    ADD CONSTRAINT "threads_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "comments"
    ADD CONSTRAINT "comments_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "threads"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "comments"
    ADD CONSTRAINT "comments_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- ============================================================
-- Verification queries (run AFTER the migration to confirm):
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'threads';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'comments';
-- SELECT unnest(enum_range(NULL::"ThreadStatus"));
-- SELECT COUNT(*) AS current_threads FROM threads;
-- ============================================================
