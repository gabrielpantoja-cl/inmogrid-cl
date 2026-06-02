-- ============================================================
-- Migración: contributions split fields (post Neon 2026-04-29)
-- ============================================================
-- Contexto: el pipeline upstream (Neon) introdujo el split
-- superficieTerreno/superficieConstruida + destino + montoUf el
-- 2026-04-29. Para que las contribuciones de usuarios alimenten ese
-- contrato (Supabase staging → revisión admin → Neon), agregamos
-- las 4 columnas en la tabla `contributions` de Supabase.
--
-- Características:
--   - Todas nullables: ningún payload viejo se rompe.
--   - IF NOT EXISTS: el script se puede correr varias veces sin
--     romper. Idempotente.
--   - No usamos `UPDATE` para backfill — los aportes existentes se
--     quedan con los nuevos campos en NULL hasta que el aportante
--     los corrija o el admin los complete en review.
--
-- Aplicar manualmente en el SQL Editor de Supabase Dashboard
-- (project_id `<supabase-project-ref>`). Después correr:
--   npm run prisma:generate
-- para sincronizar el cliente local.
-- ============================================================

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS superficie_terreno     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS superficie_construida  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS destino                TEXT,
  ADD COLUMN IF NOT EXISTS monto_uf               DOUBLE PRECISION;

-- Documentación inline (opcional pero útil para quien explore con psql):
COMMENT ON COLUMN contributions.superficie IS
  'Legacy — semántica mixta (construida/terreno). Mantener hasta que el pipeline upstream consuma exclusivamente los campos split.';
COMMENT ON COLUMN contributions.superficie_terreno IS
  'Superficie de terreno en m². NULL para propiedad horizontal (depto/oficina/parking/bodega).';
COMMENT ON COLUMN contributions.superficie_construida IS
  'Superficie construida en m². NULL para terrenos puros (W, A, F, B).';
COMMENT ON COLUMN contributions.destino IS
  'Código SII de destino (1 letra). H/W/C/A/Z/L/O/I/F/B/D/E/G/M/P/Q/S/T/V. Ver src/features/referenciales/lib/destino.ts';
COMMENT ON COLUMN contributions.monto_uf IS
  'Monto en UF cuando el aportante lo conoce. Coexiste con `monto` (CLP).';
