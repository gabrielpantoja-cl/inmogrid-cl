/**
 * Subset del clasificador SII de destinos — solo los códigos tasables.
 * Duplicado deliberadamente de @/features/referenciales/lib/destino para
 * respetar la regla de boundaries (features no se importan entre sí).
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
};

export function destinoLabel(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  return DESTINO_LABELS[code.toUpperCase()];
}

export type TipoSuperficiePrimaria = 'terreno' | 'construida' | 'mixto' | 'desconocido';

const DESTINOS_TERRENO = new Set(['W', 'A', 'B', 'F']);
const DESTINOS_HORIZONTALES = new Set(['Z', 'L', 'O', 'C', 'I']);

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
