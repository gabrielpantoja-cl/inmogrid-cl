-- ============================================================
-- Forum engagement migrations — DEFERRED, NOT YET APPLIED.
-- Apply manually in Supabase SQL Editor when ready to ship the
-- corresponding application code.
-- Generated 2026-04-30 (Gabriel autonomous overhaul session).
-- ============================================================
--
-- This file groups schema changes that the upcoming forum upgrades will
-- depend on, but are NOT shipped yet because applying them out of band
-- would force a breaking change on the live app. The companion frontend
-- code that consumes these tables is intentionally NOT in this commit;
-- ship the SQL first, regenerate Prisma client, then ship the code.
--
-- Sections:
--   1. Comment likes              (Sprint 1 D)
--   2. Best answer marking        (Sprint 1 E)
--   3. Thread cover image column  (Sprint 1 G — performance)
--   4. Thread views counter       (Sprint 2 H)
--   5. Thread follows             (Sprint 2 I — distinct from bookmark)
--   6. Thread kind enum           (Sprint 2 L — Pregunta/Caso/Discusión/Recomendación)
--   7. Postgres FTS index         (Sprint 2 G)
--
-- All sections are idempotent (`IF NOT EXISTS`, `DO $$ … duplicate_object`)
-- so re-running is safe.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Comment likes — eleva las buenas respuestas en hilos largos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "forum_comment_likes" (
    "user_id" UUID NOT NULL,
    "comment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "forum_comment_likes_pkey" PRIMARY KEY ("user_id", "comment_id")
);

CREATE INDEX IF NOT EXISTS "forum_comment_likes_comment_id_idx"
    ON "forum_comment_likes"("comment_id");

ALTER TABLE "forum_comment_likes"
    DROP CONSTRAINT IF EXISTS "forum_comment_likes_user_id_fkey";
ALTER TABLE "forum_comment_likes"
    ADD CONSTRAINT "forum_comment_likes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "forum_comment_likes"
    DROP CONSTRAINT IF EXISTS "forum_comment_likes_comment_id_fkey";
ALTER TABLE "forum_comment_likes"
    ADD CONSTRAINT "forum_comment_likes_comment_id_fkey"
    FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE;

-- Denormalized counter on comments.
ALTER TABLE "comments"
    ADD COLUMN IF NOT EXISTS "like_count" INTEGER NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 2. Best answer marking — el autor del hilo destaca la mejor respuesta
-- ------------------------------------------------------------
ALTER TABLE "threads"
    ADD COLUMN IF NOT EXISTS "best_answer_comment_id" TEXT;

ALTER TABLE "threads"
    DROP CONSTRAINT IF EXISTS "threads_best_answer_comment_id_fkey";
ALTER TABLE "threads"
    ADD CONSTRAINT "threads_best_answer_comment_id_fkey"
    FOREIGN KEY ("best_answer_comment_id")
    REFERENCES "comments"("id")
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "threads_best_answer_comment_id_idx"
    ON "threads"("best_answer_comment_id")
    WHERE "best_answer_comment_id" IS NOT NULL;

-- ------------------------------------------------------------
-- 3. Cover image cached column — evita parsear HTML en cada list
-- ------------------------------------------------------------
-- Nota: el código frontend del 2026-04-30 ya extrae la primera imagen
-- en cada query (`extractFirstImage` sobre contentHtml). Cuando este
-- SQL se aplique, mover esa extracción al INSERT/UPDATE del thread y
-- leer directamente la columna en list — corta el regex por hilo.
ALTER TABLE "threads"
    ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;

-- ------------------------------------------------------------
-- 4. Thread views — contador real de lecturas
-- ------------------------------------------------------------
-- Tabla insert-only por (thread_id, day, viewer_id|null). Permite calcular
-- vistas únicas por día sin guardar cada hit individualmente. El job de
-- agregación nightly comprime a un counter por thread y día.
CREATE TABLE IF NOT EXISTS "forum_thread_views" (
    "thread_id" TEXT NOT NULL,
    "view_date" DATE NOT NULL,
    "viewer_id" UUID,                 -- null = anónimo (deduplicado por IP/UA en otra capa)
    "ip_hash" TEXT,                   -- sha256(ip + ua + day_salt) cuando hay anónimo
    "view_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "forum_thread_views_thread_day_viewer_key"
    ON "forum_thread_views"("thread_id", "view_date", "viewer_id")
    WHERE "viewer_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "forum_thread_views_thread_day_iphash_key"
    ON "forum_thread_views"("thread_id", "view_date", "ip_hash")
    WHERE "viewer_id" IS NULL;

CREATE INDEX IF NOT EXISTS "forum_thread_views_thread_id_idx"
    ON "forum_thread_views"("thread_id");

ALTER TABLE "forum_thread_views"
    DROP CONSTRAINT IF EXISTS "forum_thread_views_thread_id_fkey";
ALTER TABLE "forum_thread_views"
    ADD CONSTRAINT "forum_thread_views_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE;

-- Denormalized counter on threads (refrescado por job).
ALTER TABLE "threads"
    ADD COLUMN IF NOT EXISTS "view_count" INTEGER NOT NULL DEFAULT 0;

-- ------------------------------------------------------------
-- 5. Thread follows — distinto de bookmark
-- ------------------------------------------------------------
-- bookmark = "guardar para mí". follow = "avísame cuando alguien
-- responda". El autor del hilo está implícitamente suscrito.
CREATE TABLE IF NOT EXISTS "forum_thread_follows" (
    "user_id" UUID NOT NULL,
    "thread_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "forum_thread_follows_pkey" PRIMARY KEY ("user_id", "thread_id")
);

CREATE INDEX IF NOT EXISTS "forum_thread_follows_thread_id_idx"
    ON "forum_thread_follows"("thread_id");

ALTER TABLE "forum_thread_follows"
    DROP CONSTRAINT IF EXISTS "forum_thread_follows_user_id_fkey";
ALTER TABLE "forum_thread_follows"
    ADD CONSTRAINT "forum_thread_follows_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "forum_thread_follows"
    DROP CONSTRAINT IF EXISTS "forum_thread_follows_thread_id_fkey";
ALTER TABLE "forum_thread_follows"
    ADD CONSTRAINT "forum_thread_follows_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE;

-- ------------------------------------------------------------
-- 6. Thread kind enum — Pregunta / Caso / Discusión / Recomendación
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "ThreadKind" AS ENUM ('question', 'case', 'discussion', 'recommendation');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "threads"
    ADD COLUMN IF NOT EXISTS "kind" "ThreadKind" NOT NULL DEFAULT 'discussion';

CREATE INDEX IF NOT EXISTS "threads_kind_status_created_at_idx"
    ON "threads"("kind", "status", "created_at");

-- ------------------------------------------------------------
-- 7. Postgres FTS — search con ranking real, no `contains` ilike
-- ------------------------------------------------------------
-- Generated column con tsvector pesado (title más alto que body).
-- Idiomas: usamos `spanish` — la mayoría del corpus está en español.
ALTER TABLE "threads"
    ADD COLUMN IF NOT EXISTS "search_vector" tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('spanish', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('spanish', coalesce("content_text", '')), 'B') ||
        setweight(to_tsvector('spanish', coalesce(array_to_string("tags", ' '), '')), 'C')
    ) STORED;

CREATE INDEX IF NOT EXISTS "threads_search_vector_idx"
    ON "threads" USING GIN ("search_vector");

COMMIT;

-- ============================================================
-- Post-apply checklist (seguir en orden):
--   ☐ Aplicar este SQL en Supabase Dashboard
--   ☐ Editar prisma/schema.prisma para reflejar:
--        - ForumCommentLike + Comment.likeCount
--        - ForumThread.bestAnswerCommentId + Thread.bestAnswer relation
--        - ForumThread.coverImageUrl
--        - ForumThreadView model
--        - ForumThreadFollow model
--        - ThreadKind enum + ForumThread.kind
--        (FTS no necesita modelo Prisma — se consulta con $queryRaw)
--   ☐ npm run prisma:generate
--   ☐ Wire up código frontend/API (PRs separados)
--   ☐ Actualizar CLAUDE.md con el estado de los nuevos features
-- ============================================================
