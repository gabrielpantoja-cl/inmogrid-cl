-- ============================================================
-- Forum likes + bookmarks — apply manually in Supabase SQL Editor
-- Generated from prisma/schema.prisma on 2026-04-21
-- Idempotente: se puede re-ejecutar sin efectos colaterales.
-- ============================================================
--
-- Agrega tres piezas sobre el esquema actual del foro:
--   1. `threads.like_count` (contador denormalizado, actualizado por la app)
--   2. `thread_likes` (user_id, thread_id) — PK compuesta
--   3. `thread_bookmarks` (user_id, thread_id) — PK compuesta
--
-- Ambas tablas tienen composite PK para garantizar que un usuario no
-- puede dar like o guardar el mismo hilo más de una vez (se lo apoyamos
-- a nivel DB, no solo a nivel app).
-- ============================================================

BEGIN;

-- 1. Columna like_count en threads
ALTER TABLE "threads"
  ADD COLUMN IF NOT EXISTS "like_count" INTEGER NOT NULL DEFAULT 0;

-- 2. Tablas
CREATE TABLE IF NOT EXISTS "thread_likes" (
    "user_id"    UUID      NOT NULL,
    "thread_id"  TEXT      NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_likes_pkey" PRIMARY KEY ("user_id", "thread_id")
);

CREATE TABLE IF NOT EXISTS "thread_bookmarks" (
    "user_id"    UUID      NOT NULL,
    "thread_id"  TEXT      NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_bookmarks_pkey" PRIMARY KEY ("user_id", "thread_id")
);

-- 3. Índices secundarios (el PK cubre los lookups por (user, thread); estos
--    cubren los lookups por thread o por user individualmente)
CREATE INDEX IF NOT EXISTS "thread_likes_thread_id_idx"
  ON "thread_likes"("thread_id");

CREATE INDEX IF NOT EXISTS "thread_bookmarks_user_id_idx"
  ON "thread_bookmarks"("user_id");

-- 4. Foreign keys (guarded)
DO $$ BEGIN
  ALTER TABLE "thread_likes"
    ADD CONSTRAINT "thread_likes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "thread_likes"
    ADD CONSTRAINT "thread_likes_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "threads"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "thread_bookmarks"
    ADD CONSTRAINT "thread_bookmarks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "thread_bookmarks"
    ADD CONSTRAINT "thread_bookmarks_thread_id_fkey"
    FOREIGN KEY ("thread_id") REFERENCES "threads"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

-- ============================================================
-- Verificación
-- ============================================================
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='threads' AND column_name='like_count';
-- SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('thread_likes','thread_bookmarks');
-- ============================================================
