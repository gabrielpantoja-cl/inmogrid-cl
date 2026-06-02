-- Forum Sprint 2 — Edit/Delete + Reports
-- ============================================================
-- CORRER MANUALMENTE en Supabase SQL Editor (proyecto
-- <supabase-project-ref>). No hay `prisma migrate deploy` en este repo.
--
-- Cambios:
-- 1. threads.edited_at TIMESTAMPTZ NULL — refleja edición manual del autor,
--    distinto de updated_at que Prisma toca en cualquier update (incluyendo
--    increments de like_count / comment_count).
-- 2. comments.edited_at TIMESTAMPTZ NULL — idem para comentarios.
-- 3. forum_reports — tabla nueva para reportes de contenido (PK compuesta
--    (reporter_id, target_type, target_id) previene duplicados).
-- ============================================================

-- Enums
CREATE TYPE "ForumReportReason" AS ENUM ('spam', 'offensive', 'misleading', 'illegal', 'other');
CREATE TYPE "ForumReportTargetType" AS ENUM ('thread', 'comment');
CREATE TYPE "ForumReportStatus" AS ENUM ('pending', 'reviewed', 'dismissed', 'actioned');

-- Añadir edited_at a threads/comments
ALTER TABLE "threads"  ADD COLUMN "edited_at" TIMESTAMP(3) NULL;
ALTER TABLE "comments" ADD COLUMN "edited_at" TIMESTAMP(3) NULL;

-- Tabla forum_reports
CREATE TABLE "forum_reports" (
    "id"          TEXT                      NOT NULL,
    "reporter_id" UUID                      NOT NULL,
    "target_type" "ForumReportTargetType"   NOT NULL,
    "target_id"   TEXT                      NOT NULL,
    "reason"      "ForumReportReason"       NOT NULL,
    "details"     TEXT,
    "status"      "ForumReportStatus"       NOT NULL DEFAULT 'pending',
    "created_at"  TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_id" UUID,
    CONSTRAINT "forum_reports_pkey" PRIMARY KEY ("id")
);

-- Un user no puede reportar el mismo target dos veces.
CREATE UNIQUE INDEX "forum_reports_reporter_id_target_type_target_id_key"
  ON "forum_reports" ("reporter_id", "target_type", "target_id");

-- Índices para el panel de moderación.
CREATE INDEX "forum_reports_status_created_at_idx"
  ON "forum_reports" ("status", "created_at");
CREATE INDEX "forum_reports_target_type_target_id_idx"
  ON "forum_reports" ("target_type", "target_id");

-- Foreign keys a profiles.
ALTER TABLE "forum_reports"
  ADD CONSTRAINT "forum_reports_reporter_id_fkey"
  FOREIGN KEY ("reporter_id") REFERENCES "profiles"("id") ON DELETE CASCADE;

ALTER TABLE "forum_reports"
  ADD CONSTRAINT "forum_reports_reviewer_id_fkey"
  FOREIGN KEY ("reviewer_id") REFERENCES "profiles"("id") ON DELETE SET NULL;

-- RLS — enabled con policies para que los reporters puedan ver sus propios
-- reportes y los admins puedan ver todo (la verificación de rol se hace
-- server-side en el handler, acá solo definimos el shape mínimo).
ALTER TABLE "forum_reports" ENABLE ROW LEVEL SECURITY;

-- Un user puede insertar reportes con su propio reporter_id.
CREATE POLICY "forum_reports_insert_own"
  ON "forum_reports" FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Un user puede leer sus propios reportes.
CREATE POLICY "forum_reports_select_own"
  ON "forum_reports" FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Admins leen y modifican todo. La check de rol se hace en el handler de
-- la API antes de llegar acá; esta policy es belt-and-suspenders.
CREATE POLICY "forum_reports_admin_all"
  ON "forum_reports" FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
  ));
