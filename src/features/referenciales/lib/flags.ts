/**
 * Detección heurística de datos sospechosos en un registro de referencial.
 *
 * Aplicada server-side sobre cada fila antes de enviarla al cliente — el
 * resultado va como parte del payload ({ flags, level }), no se persiste en
 * el schema. Razón: los criterios evolucionan y la tabla referenciales en
 * Neon es read-only desde la app.
 *
 * Thresholds por `destino` (post split 2026-04-29). Registros sin destino
 * estructurado (~34% pre-migración) no se flagean por superficie hasta que
 * el pipeline upstream los re-procese y les asigne destino + split.
 */

export type SuspiciousFlag =
  | 'monto_zero'
  | 'superficie_terreno_alta'
  | 'superficie_construida_alta'
  | 'superficie_construida_baja'
  | 'fecha_invalid'
  | 'rol_invalid';

export type SuspicionLevel = 'none' | 'low' | 'medium' | 'high';

export interface SuspicionResult {
  flags: SuspiciousFlag[];
  level: SuspicionLevel;
}

const FLAG_LABELS: Record<SuspiciousFlag, string> = {
  monto_zero: 'Monto en cero o no declarado',
  superficie_terreno_alta: 'Terreno inusualmente grande para su destino',
  superficie_construida_alta: 'Superficie construida inusualmente grande para su destino',
  superficie_construida_baja: 'Superficie construida inusualmente pequeña (<5 m²)',
  fecha_invalid: 'Fecha de escritura fuera de rango razonable',
  rol_invalid: 'ROL con formato no estándar (esperado NNNNN-NNNN)',
};

export function labelForFlag(flag: SuspiciousFlag): string {
  return FLAG_LABELS[flag];
}

interface DestinoThresholds {
  /** m² máximo razonable para superficieTerreno antes de flagear. */
  terrenoMax?: number;
  /** m² máximo razonable para superficieConstruida antes de flagear. */
  construidaMax?: number;
  /** m² mínimo para superficieConstruida (detecta data error / micro-unidades). */
  construidaMin?: number;
}

const THRESHOLDS: Record<string, DestinoThresholds> = {
  H: { terrenoMax: 10_000, construidaMax: 2_000 },     // habitacional
  W: { terrenoMax: 1_000_000 },                         // terreno (>100 ha)
  A: { terrenoMax: 50_000_000 },                        // agrícola (>5.000 ha)
  B: { terrenoMax: 50_000_000 },                        // agroindustrial
  F: { terrenoMax: 10_000_000 },                        // forestal (>1.000 ha)
  C: { construidaMax: 5_000 },                          // comercial (mall scale)
  I: { construidaMax: 50_000 },                         // industrial (mega-galpón)
  Z: { construidaMin: 5, construidaMax: 1_000 },        // estacionamiento
  L: { construidaMin: 5, construidaMax: 1_000 },        // bodega
  O: { construidaMin: 5, construidaMax: 1_000 },        // oficina
};

const ROL_REGEX = /^\d{5}-\d{4}$/;
const CURRENT_YEAR = new Date().getFullYear();
const MIN_VALID_YEAR = 1900;

export interface SuspiciousInput {
  monto?: string | null;
  montoRaw?: string | null;
  destino?: string | null;
  superficieTerreno?: number | null;
  superficieConstruida?: number | null;
  fechaescritura?: string | null; // DD/MM/YYYY (formato ya formateado)
  anio?: number | null;
  rol?: string | null;
}

function parseFechaToYear(input: string | null | undefined): number | null {
  if (!input) return null;
  const parts = input.split('/');
  if (parts.length === 3) {
    const y = Number(parts[2]);
    if (Number.isFinite(y)) return y;
  }
  const asDate = new Date(input);
  if (!Number.isNaN(asDate.getTime())) return asDate.getFullYear();
  return null;
}

export function detectSuspicious(row: SuspiciousInput): SuspicionResult {
  const flags: SuspiciousFlag[] = [];

  // monto = 0 o null
  const montoNum = row.montoRaw ? Number(row.montoRaw) : null;
  if (montoNum === null || montoNum === 0) {
    flags.push('monto_zero');
  }

  // Superficie por destino (split-aware)
  const code = row.destino?.toUpperCase();
  const thr = code ? THRESHOLDS[code] : undefined;

  if (thr) {
    if (
      thr.terrenoMax !== undefined &&
      typeof row.superficieTerreno === 'number' &&
      row.superficieTerreno > thr.terrenoMax
    ) {
      flags.push('superficie_terreno_alta');
    }
    if (
      thr.construidaMax !== undefined &&
      typeof row.superficieConstruida === 'number' &&
      row.superficieConstruida > thr.construidaMax
    ) {
      flags.push('superficie_construida_alta');
    }
    if (
      thr.construidaMin !== undefined &&
      typeof row.superficieConstruida === 'number' &&
      row.superficieConstruida > 0 &&
      row.superficieConstruida < thr.construidaMin
    ) {
      flags.push('superficie_construida_baja');
    }
  }

  // fecha futura o < 1900 (también chequea anio si fechaescritura no parsea)
  const year = parseFechaToYear(row.fechaescritura) ?? row.anio ?? null;
  if (year !== null && (year < MIN_VALID_YEAR || year > CURRENT_YEAR + 1)) {
    flags.push('fecha_invalid');
  }

  // ROL formato inválido (skip si rol es null — ausencia no es error de formato)
  if (row.rol && row.rol.trim() && !ROL_REGEX.test(row.rol.trim())) {
    flags.push('rol_invalid');
  }

  let level: SuspicionLevel = 'none';
  if (flags.length === 1) level = 'low';
  else if (flags.length === 2) level = 'medium';
  else if (flags.length >= 3) level = 'high';

  return { flags, level };
}
