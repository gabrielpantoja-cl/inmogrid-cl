import sanitizeHtml, { type IOptions } from 'sanitize-html';

/**
 * Sanitizer de HTML para posts del foro producidos por el editor Tiptap.
 *
 * Usa `sanitize-html` (pure CJS, battle-tested en serverless) en vez de
 * `isomorphic-dompurify` — esta última arrastra `jsdom` + transitivas
 * ESM-only (`html-encoding-sniffer`, `@exodus/bytes`) que rompen el
 * bundling de Vercel con `ERR_REQUIRE_ESM`.
 */

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'a',
  'ul',
  'ol',
  'li',
  'img',
  'blockquote',
  'code',
  'pre',
];

const BASE_OPTIONS: IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    // `class` solo admite valores exactos via allowedClasses más abajo — eso
    // previene que un usuario inyecte class="bg-red-500 text-xl" y reviente
    // el layout del feed.
    a: ['href', 'target', 'rel', 'title', 'class'],
    img: ['src', 'alt', 'title', 'loading'],
  },
  // Class whitelist — solo "mention" es aceptable en links (lo usamos para
  // @username). Cualquier otra class se strippea.
  allowedClasses: {
    a: ['mention'],
  },
  // Esquemas permitidos en atributos URL: http/https + mailto para links,
  // y relativos (href="/algo" o "#anchor") se resuelven via allowedSchemesAppliedToAttributes.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['https'],
  },
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  // `transformTags` actúa sobre cada nodo antes de decidir si se filtra.
  transformTags: {
    a: (tagName, attribs) => {
      // sanitize-html ya filtra href por esquema. Lo que agregamos:
      // - Links externos (http/https/mailto): target=_blank + rel=noopener nofollow
      // - Links internos (/ratos, #anchor): navegación normal (same tab)
      // - Menciones (class="mention"): siempre internos, sin target blank
      const nextAttribs: Record<string, string> = { ...attribs };
      const href = nextAttribs.href ?? '';
      const isInternal =
        href.startsWith('/') || href.startsWith('#') || nextAttribs.class === 'mention';
      if (href && !isInternal) {
        nextAttribs.target = '_blank';
        nextAttribs.rel = 'noopener nofollow';
      }
      return { tagName, attribs: nextAttribs };
    },
    img: (tagName, attribs) => {
      const nextAttribs: Record<string, string> = { ...attribs };
      if (nextAttribs.src) {
        nextAttribs.loading = 'lazy';
      }
      return { tagName, attribs: nextAttribs };
    },
  },
};

// Tiptap genera `<p></p>` cuando el usuario presiona Enter sin texto. En el
// editor son visibles (ProseMirror les inyecta min-height para cursor), pero
// renderizados en el feed colapsan a 0px y crean la falsa expectativa de
// "salto de párrafo perdido". Reddit-style: strippeamos *todos* los párrafos
// vacíos y dejamos que el margen CSS de prose-p:my-5 (≈20px) se encargue de
// la separación visible. Editor y publicado quedan WYSIWYG.
function stripEmptyParagraphs(html: string): string {
  const emptyParagraph = /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;
  return html.replace(emptyParagraph, '');
}

export function sanitizeThreadHtml(dirty: string): string {
  const sanitized = sanitizeHtml(dirty, BASE_OPTIONS);
  return stripEmptyParagraphs(sanitized).trim();
}

export function stripHtml(html: string): string {
  const cleaned = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return cleaned.replace(/\s+/g, ' ').trim();
}
