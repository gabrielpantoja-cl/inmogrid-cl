/**
 * Diccionario de códigos de `destino` que viajan con cada referencial desde
 * Neon (campo agregado en migración 2026-04-29). Origen: clasificador SII.
 * Cada código es una sola letra.
 *
 * El campo es opcional: ~34% de records pre-migración llegan en NULL hasta
 * que el pipeline de ingesta re-procese con backfill — los consumers deben
 * tolerar `undefined`/desconocido.
 */
export const DESTINO_LABELS: Record<string, string> = {
  H: 'Habitacional',
  W: 'Terreno (Sitio Eriazo)',
  C: 'Comercial',
  O: 'Oficina',
  Z: 'Estacionamiento',
  L: 'Bodega y Almacenaje',
  I: 'Industrial',
  A: 'Agrícola',
  B: 'Agroindustrial',
  F: 'Forestal',
  D: 'Deporte y Recreación',
  E: 'Educación y Cultura',
  G: 'Hotel y Motel',
  M: 'Minería',
  P: 'Administración Pública',
  Q: 'Culto',
  S: 'Salud',
  T: 'Transporte y Telecomunicaciones',
  V: 'Otros no considerados',
};

/**
 * Devuelve el label legible para un código de destino. Si el código no está
 * en el diccionario o es `undefined`/`null`, devuelve `undefined` para que el
 * caller decida el fallback (vs. mostrar el código crudo).
 */
export function destinoLabel(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  return DESTINO_LABELS[code.toUpperCase()];
}

/**
 * Destinos donde la propiedad es un lote sin construcción significativa.
 * Valor de mercado se define por m² de terreno.
 */
export const DESTINOS_TERRENO = new Set(['W', 'A', 'B', 'F']);
//                                       └── Eriazo, Agrícola, Agroindustrial, Forestal

/**
 * Destinos en propiedad horizontal (o regla de uso similar): la unidad ocupa
 * un piso/lote común y el terreno propio es alícuota. Valor por m² construido.
 *
 * Nota: C (Comercial) e I (Industrial) entran aquí asumiendo construcción
 * sustantiva — un local de calle con terreno propio sigue valorándose por
 * construida en el mercado típico.
 */
export const DESTINOS_HORIZONTALES = new Set(['Z', 'L', 'O', 'C', 'I']);
//                                            └── Estac., Bodega, Oficina, Comercial, Industrial

/**
 * H (Habitacional) es ambiguo: una casa tiene terreno + construida, un depto
 * sólo construida. La distinción se hace por presencia del campo, no por destino.
 */

export type TipoSuperficiePrimaria = 'terreno' | 'construida' | 'mixto' | 'desconocido';

/**
 * Devuelve qué superficie domina semánticamente para un destino dado.
 * - `terreno`: el m² terreno es el dato relevante (W, A, B, F)
 * - `construida`: el m² construido es el dato relevante (Z, L, O, C, I)
 * - `mixto`: depende de los datos del record (sólo H — casa vs depto)
 * - `desconocido`: destino NULL o no clasificado (records pre-migración, V, otros)
 */
export function tipoSuperficiePrimaria(
  destino: string | null | undefined
): TipoSuperficiePrimaria {
  if (!destino) return 'desconocido';
  const code = destino.toUpperCase();
  if (DESTINOS_TERRENO.has(code)) return 'terreno';
  if (DESTINOS_HORIZONTALES.has(code)) return 'construida';
  if (code === 'H') return 'mixto';
  return 'desconocido';
}
