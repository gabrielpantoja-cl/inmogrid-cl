-- =============================================================================
-- Supabase — Profile: campos de contacto opcionales (linkedin-like model)
-- Fecha: 2026-04-29
-- =============================================================================
--
-- CONTEXTO
-- --------
-- Eliminamos /cuenta/privacidad y adoptamos modelo "linkedin-like": cada
-- usuario rellena los campos de contacto que QUIERE compartir; los vacíos
-- no se muestran en su perfil público. Necesitamos dos columnas nuevas:
--
--   - contact_email: email separado del de autenticación. Permite que el
--     usuario muestre "contacto@miempresa.cl" mientras se autentica con
--     "personal@gmail.com". Si NULL, no se muestra.
--   - address: dirección de oficina libre (ej "Av. Apoquindo 4501, of. 502").
--     Texto único, no estructurado, opcional. Si NULL, no se muestra.
--
-- IDEMPOTENCIA
-- ------------
-- ADD COLUMN IF NOT EXISTS — re-correr es seguro. No hace UPDATE.
--
-- DESHACER
-- --------
--   ALTER TABLE profiles DROP COLUMN IF EXISTS contact_email;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS address;
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS address       TEXT;

COMMENT ON COLUMN profiles.contact_email IS
  'Email de contacto público (opcional). Distinto del email de autenticación (auth.users.email). Si NULL, no se muestra en el perfil público.';
COMMENT ON COLUMN profiles.address IS
  'Dirección de oficina (opcional, texto libre). Si NULL, no se muestra. Coexiste con region/commune como agrupación.';

-- =============================================================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- =============================================================================
--
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'profiles'
--     AND column_name IN ('contact_email', 'address');
--
--   -- Esperado: 2 filas, ambas TEXT y nullable=YES.
-- =============================================================================
