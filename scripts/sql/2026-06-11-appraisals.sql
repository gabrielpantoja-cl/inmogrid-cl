-- Tasaciones online gratuitas — tabla de resultados persistidos
-- Ejecutar en Supabase SQL Editor (Dashboard)
-- Idempotente: usa IF NOT EXISTS en todas las operaciones

-- 1. Tabla principal
CREATE TABLE IF NOT EXISTS appraisals (
  id                    TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id               UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Inputs
  comuna                TEXT        NOT NULL,
  destino               TEXT        NOT NULL,
  superficie_terreno    FLOAT,
  superficie_construida FLOAT,
  ano_construccion      INT,
  estado_conservacion   TEXT,       -- STATE_1 .. STATE_5
  calidad               TEXT,       -- ECONOMIC | MEDIUM | GOOD | VERY_GOOD | EXCELLENT
  disposicion           TEXT,       -- FRONT | CORNER | LATERAL | INTERNAL

  -- Resultado calculado
  valor_estimado_uf     FLOAT,
  valor_min_uf          FLOAT,
  valor_max_uf          FLOAT,
  mediana_mercado_uf_m2 FLOAT,
  comparables_usados    INT,
  nivel_confianza       TEXT,       -- bajo | medio | alto
  status                TEXT        NOT NULL DEFAULT 'completed'
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS appraisals_user_id_created_at_idx ON appraisals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS appraisals_comuna_idx ON appraisals(comuna);

-- 3. updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_appraisals_updated_at'
      AND tgrelid = 'appraisals'::regclass
  ) THEN
    CREATE TRIGGER set_appraisals_updated_at
      BEFORE UPDATE ON appraisals
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;

-- 4. RLS
ALTER TABLE appraisals ENABLE ROW LEVEL SECURITY;

-- DROP + CREATE para idempotencia (POLICY no soporta IF NOT EXISTS)
DROP POLICY IF EXISTS "appraisals_select_own"  ON appraisals;
DROP POLICY IF EXISTS "appraisals_insert_own"  ON appraisals;
DROP POLICY IF EXISTS "appraisals_update_own"  ON appraisals;
DROP POLICY IF EXISTS "appraisals_delete_own"  ON appraisals;
DROP POLICY IF EXISTS "appraisals_admin_all"   ON appraisals;

-- Dueño lee y escribe sus propias tasaciones
CREATE POLICY "appraisals_select_own"
  ON appraisals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "appraisals_insert_own"
  ON appraisals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appraisals_update_own"
  ON appraisals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appraisals_delete_own"
  ON appraisals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins ven todo (necesario para soporte)
CREATE POLICY "appraisals_admin_all"
  ON appraisals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'superadmin')
    )
  );
