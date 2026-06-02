import { prisma } from '@/shared/lib/prisma';

// Match @username tokens. Usernames en inmogrid son alfanuméricos, 3-20
// chars. Requiere whitespace/inicio-de-string/paréntesis antes para no
// pescar emails (@foo.com) ni handles en medio de palabras.
const MENTION_REGEX = /(^|[\s(\[])@([a-z0-9]{3,20})\b/gi;

export function extractMentionUsernames(text: string): string[] {
  const found = new Set<string>();
  // Array.from en vez de spread/for-of sobre .matchAll — este último
  // requiere target ES2015+ con downlevelIteration y el tsconfig del
  // proyecto no lo tiene habilitado.
  const matches = Array.from(text.matchAll(MENTION_REGEX));
  for (const match of matches) {
    found.add(match[2].toLowerCase());
  }
  return Array.from(found);
}

/**
 * Dado el texto plano (contentText) de un hilo/comment, resuelve las
 * menciones @username a profiles existentes. Devuelve el Map usernmae→id.
 * Solo incluye usernames que matcheen un perfil real.
 */
export async function resolveMentions(
  text: string,
): Promise<Map<string, string>> {
  const usernames = extractMentionUsernames(text);
  if (usernames.length === 0) return new Map();

  const profiles = await prisma.profile.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true },
  });

  const result = new Map<string, string>();
  for (const p of profiles) {
    if (p.username) result.set(p.username.toLowerCase(), p.id);
  }
  return result;
}

/**
 * Reemplaza @username en el HTML por un link al perfil, pero solo para los
 * usernames que resolvieron a un profile real. El HTML viene ya sanitizado
 * — hacemos replace textual dentro de nodos de texto (seguro porque no
 * inyectamos nada que cambie estructura HTML).
 *
 * Estrategia: el HTML sanitizado no tiene atributos peligrosos, así que
 * podemos hacer replace global en el string. Los tokens @username fuera
 * de elementos de texto no existen en este contexto (sanitize-html ya
 * normalizó todo). El link que inyectamos usa atributos del mismo set
 * permitido por el sanitizer.
 */
export function linkifyMentions(
  html: string,
  mentions: Map<string, string>,
): string {
  if (mentions.size === 0) return html;
  return html.replace(MENTION_REGEX, (full, prefix, username: string) => {
    if (!mentions.has(username.toLowerCase())) return full;
    const safe = username.replace(/[^a-z0-9]/gi, '');
    return `${prefix}<a href="/${safe}" class="mention">@${safe}</a>`;
  });
}
