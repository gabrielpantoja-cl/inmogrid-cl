/**
 * Enmascaramiento de PII (Personally Identifiable Information).
 *
 * Aplicado server-side antes de que los datos viajen al cliente, para que el
 * rol `user` nunca reciba el valor original del JSON. Solo `admin` y
 * `superadmin` reciben los valores sin máscara.
 *
 * Formato: `Juan Pérez` → `J**n P***z` (primera y última letra reveladas,
 * asteriscos en el medio). El número de asteriscos depende del largo real
 * del segmento, lo que permite al lector inferir si el nombre es corto o
 * largo sin revelar las letras intermedias.
 */

/** Enmascara una palabra individual siguiendo el pattern `J**n`. */
function maskWord(word: string): string {
  if (word.length <= 1) return word;
  if (word.length === 2) return `${word[0]}*`;
  const middle = '*'.repeat(word.length - 2);
  return `${word[0]}${middle}${word[word.length - 1]}`;
}

/**
 * Enmascara un nombre propio (puede tener múltiples palabras).
 * Retorna `null` si el input es null/undefined; `'—'` si es string vacío
 * tras trim.
 */
export function maskName(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return '—';
  return trimmed.split(/\s+/).map(maskWord).join(' ');
}

/**
 * Detecta y enmascara nombres propios en texto libre (campo `observaciones`).
 *
 * Heurística: busca 2+ palabras capitalizadas consecutivas (típico patrón de
 * "Nombre Apellido"). No es perfecto — puede dar falsos positivos en nombres
 * de calles (`Avenida Los Leones`) o fundos (`Fundo La Esperanza`). A cambio
 * tampoco deja pasar nombres reales con regularidad.
 *
 * Palabras que usualmente encabezan direcciones/predios y NO deberían
 * enmascararse con sus siguientes.
 */
const ADDRESS_PREFIXES = new Set([
  'avenida',
  'av',
  'calle',
  'pasaje',
  'camino',
  'fundo',
  'parcela',
  'villa',
  'sitio',
  'lote',
  'predio',
  'hijuela',
  'ruta',
  'carretera',
]);

const NAME_REGEX =
  /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,}(?:\s+(?:de|del|la|las|los|el|y)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,}|\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,}){1,3}\b/g;

export function maskObservaciones(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  if (!value.trim()) return value;

  return value.replace(NAME_REGEX, (match) => {
    const firstWord = match.split(/\s+/)[0].toLowerCase();
    if (ADDRESS_PREFIXES.has(firstWord)) return match;
    return match
      .split(/\s+/)
      .map((w) => {
        // Conservar palabras conectoras ("de", "del", "la", "los") sin enmascarar
        const lower = w.toLowerCase();
        if (['de', 'del', 'la', 'las', 'los', 'el', 'y'].includes(lower)) {
          return w;
        }
        return maskWord(w);
      })
      .join(' ');
  });
}

/**
 * Aplica masking según el rol del viewer. Los roles `admin` y `superadmin`
 * ven los valores originales; el resto ve la versión enmascarada.
 */
export function maskByRole<T extends string | null | undefined>(
  value: T,
  role: string,
  masker: (v: T) => T | null
): T | null {
  if (role === 'admin' || role === 'superadmin') {
    return value ?? null;
  }
  return masker(value);
}
