-- ============================================================
-- Contributions + points_ledger migration — apply manually in Supabase SQL Editor
-- (project ref in CLAUDE.local.md, not committed here)
-- Generated from prisma/schema.prisma on 2026-04-26
-- ============================================================
--
-- Context: el modelo Contribution + los enums ContributionType y
-- ContributionStatus existen en prisma/schema.prisma pero la migración SQL
-- nunca se ejecutó en producción. Resultado: POST /api/referenciales/contribute
-- responde 500 con `type "public.ContributionType" does not exist` (Postgres
-- code 42704) porque Prisma intenta INSERT con un cast al tipo enum.
--
-- Mismo problema aplica a InmogridPointsLedger / PointReason — awardPoints()
-- corre en background con .catch() así que falla silencioso, pero si nunca
-- creamos la tabla los reportes/correcciones jamás otorgan puntos.
--
-- Este script crea los enums y tablas con IF NOT EXISTS donde Postgres lo
-- permite, así que re-ejecutarlo es seguro.
-- ============================================================

BEGIN;

-- ─── Enums ──────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "ContributionType" AS ENUM ('new', 'correction', 'report');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContributionStatus" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PointReason" AS ENUM (
    'POST_PUBLISHED',
    'CONTRIBUTION_APPROVED',
    'CORRECTION_APPROVED',
    'BUG_REPORT',
    'BADGE_EARNED',
    'MANUAL_ADJUSTMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Table: contributions ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "contributions" (
  "id"                TEXT PRIMARY KEY,
  "user_id"           UUID NOT NULL,
  "source_id"         TEXT,
  "contribution_type" "ContributionType" NOT NULL DEFAULT 'new',
  "lat"               DOUBLE PRECISION NOT NULL,
  "lng"               DOUBLE PRECISION NOT NULL,
  "fojas"             TEXT,
  "numero"            INTEGER,
  "anio"              INTEGER,
  "cbr"               TEXT,
  "predio"            TEXT,
  "comuna"            TEXT,
  "rol"               TEXT,
  "fechaescritura"    TIMESTAMP(3),
  "superficie"        DOUBLE PRECISION,
  "monto"             BIGINT,
  "observaciones"     TEXT,
  "status"            "ContributionStatus" NOT NULL DEFAULT 'pending',
  "reviewer_id"       UUID,
  "review_note"       TEXT,
  "reviewed_at"       TIMESTAMP(3),
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "contributions_user_id_idx"   ON "contributions"("user_id");
CREATE INDEX IF NOT EXISTS "contributions_status_idx"    ON "contributions"("status");
CREATE INDEX IF NOT EXISTS "contributions_source_id_idx" ON "contributions"("source_id");
CREATE INDEX IF NOT EXISTS "contributions_comuna_idx"    ON "contributions"("comuna");

-- Trigger para mantener updated_at en sync (Prisma usa @updatedAt)
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER contributions_set_updated_at
    BEFORE UPDATE ON "contributions"
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Table: points_ledger ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "points_ledger" (
  "id"           TEXT PRIMARY KEY,
  "user_id"      UUID NOT NULL,
  "points"       INTEGER NOT NULL,
  "reason"       "PointReason" NOT NULL,
  "reference_id" TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "points_ledger_user_id_created_at_idx"
  ON "points_ledger"("user_id", "created_at");

COMMIT;
