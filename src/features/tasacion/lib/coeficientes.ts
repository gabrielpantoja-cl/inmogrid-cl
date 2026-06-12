/**
 * Coeficientes de ajuste para el mercado inmobiliario chileno.
 * Alineados con criterios SII y práctica tasadora local.
 */

// ── Calidad constructiva (norma SII Chile) ──────────────────────────────────
export type QualityType = 'ECONOMIC' | 'MEDIUM' | 'GOOD' | 'VERY_GOOD' | 'EXCELLENT';

export const QUALITY_COEFFICIENTS: Record<QualityType, number> = {
  ECONOMIC:  0.85,
  MEDIUM:    1.00,
  GOOD:      1.08,
  VERY_GOOD: 1.18,
  EXCELLENT: 1.30,
};

export const QUALITY_LABELS: Record<QualityType, string> = {
  ECONOMIC:  'Económica',
  MEDIUM:    'Media',
  GOOD:      'Buena',
  VERY_GOOD: 'Muy buena',
  EXCELLENT: 'Excelente',
};

// ── Estado de conservación (9 niveles Ross-Heidecke) ───────────────────────
export type ConservationStateType =
  | 'STATE_1' | 'STATE_1_5' | 'STATE_2' | 'STATE_2_5' | 'STATE_3'
  | 'STATE_3_5' | 'STATE_4' | 'STATE_4_5' | 'STATE_5';

export const CONSERVATION_LABELS: Record<ConservationStateType, string> = {
  STATE_1:   'Nuevo o muy bueno',
  STATE_1_5: 'Entre nuevo y conservación normal',
  STATE_2:   'Conservación normal',
  STATE_2_5: 'Entre normal y reparaciones sencillas',
  STATE_3:   'Reparaciones sencillas',
  STATE_3_5: 'Entre reparaciones sencillas e importantes',
  STATE_4:   'Reparaciones importantes',
  STATE_4_5: 'Entre reparaciones importantes y demolición',
  STATE_5:   'Demolición',
};

// ── Disposición / ubicación dentro del predio (opcional) ───────────────────
// Aplica principalmente a departamentos y locales comerciales.
export type DispositionType = 'FRONT' | 'CORNER' | 'LATERAL' | 'INTERNAL';

export const DISPOSITION_COEFFICIENTS: Record<DispositionType, number> = {
  FRONT:    1.00,
  CORNER:   1.03,  // Esquina: premium en Chile para comercial/depto
  LATERAL:  0.93,
  INTERNAL: 0.90,
};

export const DISPOSITION_LABELS: Record<DispositionType, string> = {
  FRONT:    'Frente a la calle',
  CORNER:   'Esquina',
  LATERAL:  'Lateral',
  INTERNAL: 'Interior (patio/pasillo)',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

export function getQualityCoef(quality: QualityType | undefined | null): number {
  if (!quality) return QUALITY_COEFFICIENTS.MEDIUM;
  return QUALITY_COEFFICIENTS[quality] ?? 1.0;
}

export function getDispositionCoef(disp: DispositionType | undefined | null): number {
  if (!disp) return 1.0;
  return DISPOSITION_COEFFICIENTS[disp] ?? 1.0;
}
