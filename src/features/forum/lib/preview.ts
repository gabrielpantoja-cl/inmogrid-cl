// Helpers de preview para el feed del foro.
//
// El backend extrae aquí (1) la primera imagen del HTML sanitizado y
// (2) un texto plano truncado. Hacerlo server-side mantiene el cliente
// liviano y evita que cada card haga regex sobre HTML potencialmente
// largo (50k chars).
//
// La extracción es regex-based (no DOM) porque corremos en runtime
// node/edge sin DOM. sanitize-html ya garantiza que los `<img>` que
// llegan acá son seguros (allowlist src, https-only, lazy loading).

const IMG_TAG_RE = /<img\b[^>]*\bsrc\s*=\s*("([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/i;

/**
 * Devuelve la URL del primer `<img>` del HTML sanitizado, o `null` si no
 * hay imágenes. Acepta src entre comillas dobles, simples o sin comillas.
 */
export function extractFirstImage(html: string | null | undefined): string | null {
  if (!html) return null;
  const match = IMG_TAG_RE.exec(html);
  if (!match) return null;
  const url = match[2] ?? match[3] ?? match[4] ?? null;
  if (!url) return null;
  // Sólo permitimos https — coincide con el allowlist de sanitize-html y
  // evita mixed-content si por alguna razón llega un http://.
  if (!url.startsWith('https://') && !url.startsWith('/')) return null;
  return url;
}

/**
 * Trunca el texto plano del cuerpo del hilo a un tamaño razonable para
 * el feed. Cortamos en límite de palabra cuando es posible para no
 * dejar palabras a medio.
 */
export function buildPreview(contentText: string, maxLen = 320): string {
  const trimmed = contentText.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  // Si la última palabra es muy larga (>40 chars) cortamos en seco.
  const safe = lastSpace > maxLen - 40 ? cut.slice(0, lastSpace) : cut;
  return `${safe.trimEnd()}…`;
}
