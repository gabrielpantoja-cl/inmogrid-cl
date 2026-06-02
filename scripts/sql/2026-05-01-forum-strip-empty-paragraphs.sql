-- Strip empty paragraphs from existing forum threads y comments.
--
-- Contexto: el sanitizer anterior (collapseEmptyParagraphs) preservaba un
-- <p></p> entre párrafos. Renderizado en el feed/detalle colapsa a 0px de
-- altura — el usuario ve los párrafos pegados aunque tipeó Enter Enter en
-- el editor. Reddit-style: stripeamos todos los empties en input y la
-- separación visible viene 100% del margen CSS (prose-p:my-5 ≈ 20px).
--
-- Esta migración es one-shot sobre la data ya guardada — el código nuevo
-- ya no genera empties al hacer POST/PATCH.
--
-- Idempotente: re-ejecutar es no-op (no quedan rows que matcheen el patrón).
-- Safe: sólo toca content_html. contentText, slug, tags, counters intactos.

BEGIN;

-- 1. threads.content_html
UPDATE threads
SET content_html = regexp_replace(
  content_html,
  '<p>([[:space:]]|&nbsp;|<br[[:space:]]*/?>)*</p>',
  '',
  'gi'
)
WHERE content_html ~* '<p>([[:space:]]|&nbsp;|<br[[:space:]]*/?>)*</p>';

-- 2. comments.content_html (mismo sanitizer aplica)
UPDATE comments
SET content_html = regexp_replace(
  content_html,
  '<p>([[:space:]]|&nbsp;|<br[[:space:]]*/?>)*</p>',
  '',
  'gi'
)
WHERE content_html ~* '<p>([[:space:]]|&nbsp;|<br[[:space:]]*/?>)*</p>';

-- Verificación: ambos counts deben ser 0 tras el UPDATE.
SELECT
  (SELECT COUNT(*) FROM threads
    WHERE content_html ~* '<p>([[:space:]]|&nbsp;|<br[[:space:]]*/?>)*</p>') AS threads_remaining,
  (SELECT COUNT(*) FROM comments
    WHERE content_html ~* '<p>([[:space:]]|&nbsp;|<br[[:space:]]*/?>)*</p>') AS comments_remaining;

COMMIT;
