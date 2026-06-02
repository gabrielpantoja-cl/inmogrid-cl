-- =============================================================================
-- 2026-05-18 — posts: limpieza de columnas legacy
-- =============================================================================
--
-- Contexto
-- --------
-- La tabla `posts` arrastraba pares legacy/nueva por coexistencia con un
-- proyecto externo que ya no usa esta DB. Inmogrid migró 100% a las
-- columnas nuevas (commit 48c0940c, 2026-05-18). Las legacy quedaron
-- huérfanas y se drop aquí.
--
-- Mapeo:
--   image       → cover_image_url   (text, nullable)
--   status      → published         (boolean)
--   author_id   → user_id           (uuid)
--   category    → (eliminada — no se usa en el dominio actual)
--
-- Estado previo verificado por SQL (2026-05-18):
--   total                          = 16
--   user_id IS NULL                = 0   ← seguro hacer NOT NULL
--   user_id = author_id            = 16  ← redundancia confirmada
--   (status='published') = published= 16  ← redundancia confirmada
--   cover_image_url IS NULL        = 0   ← todas migradas
--
-- Prerrequisito de código (DEBE estar en producción antes de aplicar):
--   - blog/page.tsx, blog/[slug]/page.tsx, directorio/page.tsx,
--     api/public/posts/route.ts: ya NO referencian p.author_id, p.status,
--     ni p.category. Verificar con:
--       grep -rn "p\.author_id\|p\.status\|p\.category" src/
--
-- Idempotente: las cláusulas IF EXISTS permiten re-ejecutar sin error.
-- =============================================================================

BEGIN;

-- 1. CHECK constraints legacy (status y category)
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_category_check;

-- 2. FK constraint legacy a auth.users — el FK válido posts_user_id_fkey
--    apunta a profiles(id) y se conserva intacto.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;

-- 3. user_id pasa a NOT NULL (los 16 posts ya tienen valor — verificado).
--    Replica la invariante que cumplía author_id antes.
ALTER TABLE public.posts ALTER COLUMN user_id SET NOT NULL;

-- 4. Drop de columnas legacy
ALTER TABLE public.posts DROP COLUMN IF EXISTS image;
ALTER TABLE public.posts DROP COLUMN IF EXISTS status;
ALTER TABLE public.posts DROP COLUMN IF EXISTS author_id;
ALTER TABLE public.posts DROP COLUMN IF EXISTS category;

-- 5. Sanity check: si algo está mal después del drop, RAISE bloquea el COMMIT
DO $$
DECLARE
  null_user_count int;
BEGIN
  SELECT COUNT(*) INTO null_user_count FROM public.posts WHERE user_id IS NULL;
  IF null_user_count > 0 THEN
    RAISE EXCEPTION 'posts cleanup: % rows have NULL user_id after migration', null_user_count;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- Verificación post-aplicación (correr aparte, debería retornar 0 filas):
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'posts'
--     AND column_name IN ('image','status','author_id','category');
--
-- =============================================================================
