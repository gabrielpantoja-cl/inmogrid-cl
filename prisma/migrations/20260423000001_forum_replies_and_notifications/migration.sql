-- Forum Sprint 3 — Replies anidadas + Notificaciones
-- ============================================================
-- CORRER MANUALMENTE en Supabase SQL Editor, DESPUÉS de la migration
-- 20260423000000 (edited_at + forum_reports). No es destructivo.
--
-- Cambios:
-- 1. comments.parent_id TEXT NULL + FK self-reference + índice. Permite
--    replies anidadas hasta 2 niveles (el backend colapsa más profundidad).
-- 2. forum_notifications — notifs para menciones, replies y comentarios
--    en hilos propios.
-- ============================================================

-- 1) Replies en comentarios
ALTER TABLE "comments" ADD COLUMN "parent_id" TEXT NULL;
ALTER TABLE "comments"
  ADD CONSTRAINT "comments_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE SET NULL;
CREATE INDEX "comments_parent_id_idx" ON "comments" ("parent_id");

-- 2) Notificaciones del foro
CREATE TYPE "ForumNotificationType" AS ENUM ('mention', 'reply', 'comment_on_thread');

CREATE TABLE "forum_notifications" (
    "id"           TEXT                     NOT NULL,
    "recipient_id" UUID                     NOT NULL,
    "actor_id"     UUID,
    "type"         "ForumNotificationType"  NOT NULL,
    "thread_id"    TEXT                     NOT NULL,
    "comment_id"   TEXT,
    "read_at"      TIMESTAMP(3),
    "created_at"   TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "forum_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "forum_notifications_recipient_id_read_at_created_at_idx"
  ON "forum_notifications" ("recipient_id", "read_at", "created_at");

ALTER TABLE "forum_notifications"
  ADD CONSTRAINT "forum_notifications_recipient_id_fkey"
  FOREIGN KEY ("recipient_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "forum_notifications"
  ADD CONSTRAINT "forum_notifications_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE SET NULL;

ALTER TABLE "forum_notifications"
  ADD CONSTRAINT "forum_notifications_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "threads"("id") ON DELETE CASCADE;

ALTER TABLE "forum_notifications"
  ADD CONSTRAINT "forum_notifications_comment_id_fkey"
  FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE;

-- RLS — cada user solo lee/modifica sus propias notificaciones.
ALTER TABLE "forum_notifications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_notifications_select_own"
  ON "forum_notifications" FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "forum_notifications_update_own"
  ON "forum_notifications" FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Los inserts son hechos por el backend usando service_role (createComment
-- / createThread), así que no expondremos insert a authenticated. Si en el
-- futuro se hace con RLS, agregar policy con WITH CHECK específico.
