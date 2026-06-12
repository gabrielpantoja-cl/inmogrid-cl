import type { ComparableRow } from '@/shared/lib/queries/referenciales';
import { tipoSuperficiePrimaria } from './destino';
import { calcEdadEstadoCoef } from './ross-heidecke';
import { getQualityCoef, getDispositionCoef } from './coeficientes';
import type { AppraisalInput, AppraisalResult, ComparableUsado, NivelConfianza } from './types';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function nivelConfianza(n: number): NivelConfianza {
  if (n >= 20) return 'alto';
  if (n >= 5) return 'medio';
  return 'bajo';
}

/**
 * Motor de tasación basado en comparables de Neon.
 *
 * Método:
 *   1. Calcula UF/m² de cada comparable usando la superficie semánticamente
 *      correcta según `destino`.
 *   2. Obtiene mediana (P50), P25 y P75 del mercado.
 *   3. Aplica factores de ajuste del sujeto: edad (Ross-Heidecke), calidad,
 *      disposición — relativos a la mediana del mercado.
 *   4. Valor estimado = superficie × UF/m² ajustado.
 *      Rango = superficie × [P25, P75] (datos reales, sin ajuste).
 */
export function calcularTasacion(
  input: AppraisalInput,
  comparables: ComparableRow[]
): AppraisalResult | null {
  const tipo = tipoSuperficiePrimaria(input.destino);

  // Determinar qué superficie usar para el sujeto
  let superficieUsada: number | null = null;
  let fuenteSuperficie: 'terreno' | 'construida' = 'terreno';

  if (tipo === 'terreno') {
    superficieUsada = input.superficieTerreno ?? null;
    fuenteSuperficie = 'terreno';
  } else if (tipo === 'construida') {
    superficieUsada = input.superficieConstruida ?? null;
    fuenteSuperficie = 'construida';
  } else if (tipo === 'mixto') {
    // H (Habitacional): preferir terreno si está (casa), sino construida (depto)
    if (input.superficieTerreno) {
      superficieUsada = input.superficieTerreno;
      fuenteSuperficie = 'terreno';
    } else {
      superficieUsada = input.superficieConstruida ?? null;
      fuenteSuperficie = 'construida';
    }
  }

  if (!superficieUsada || superficieUsada <= 0) return null;

  // Calcular UF/m² para cada comparable
  const comparablesValidos: ComparableUsado[] = [];

  for (const c of comparables) {
    if (!c.montoUf || c.montoUf <= 0) continue;

    let sup: number | null = null;

    if (tipo === 'terreno') {
      sup = c.superficieTerreno;
    } else if (tipo === 'construida') {
      sup = c.superficieConstruida;
    } else if (tipo === 'mixto') {
      // Para H: si el comparable tiene terreno Y construida, preferimos
      // el mismo campo que decidimos para el sujeto
      if (fuenteSuperficie === 'terreno') {
        sup = c.superficieTerreno ?? c.superficieConstruida;
      } else {
        sup = c.superficieConstruida ?? c.superficieTerreno;
      }
    }

    if (!sup || sup <= 0) continue;

    const ufM2 = c.montoUf / sup;
    if (!Number.isFinite(ufM2) || ufM2 <= 0) continue;

    comparablesValidos.push({
      id: c.id,
      anio: c.anio,
      fechaescritura: c.fechaescritura.toISOString().slice(0, 10),
      superficieTerreno: c.superficieTerreno,
      superficieConstruida: c.superficieConstruida,
      montoUf: c.montoUf,
      ufM2,
      predio: c.predio ?? undefined,
      rol: c.rol ?? undefined,
      fojas: c.fojas ?? undefined,
      numero: c.numero ?? undefined,
    });
  }

  if (comparablesValidos.length === 0) return null;

  const valoresUfM2 = comparablesValidos.map((c) => c.ufM2).sort((a, b) => a - b);

  const medianaMercadoUfM2 = percentile(valoresUfM2, 50);
  const p25UfM2 = percentile(valoresUfM2, 25);
  const p75UfM2 = percentile(valoresUfM2, 75);

  // Factores de ajuste del sujeto relativos a la mediana del mercado
  const currentYear = new Date().getFullYear();
  const age = input.anoConstruccion ? currentYear - input.anoConstruccion : 0;
  const state = input.estadoConservacion ?? 'STATE_2';

  const factorEdad = calcEdadEstadoCoef(age, state);
  const factorCalidad = getQualityCoef(input.calidad ?? null);
  const factorDisposicion = getDispositionCoef(input.disposicion ?? null);
  const factorTotal = factorEdad * factorCalidad * factorDisposicion;

  const sujeto_ufM2 = medianaMercadoUfM2 * factorTotal;

  const valorEstimadoUf = superficieUsada * sujeto_ufM2;
  const valorMinUf = superficieUsada * p25UfM2;
  const valorMaxUf = superficieUsada * p75UfM2;

  return {
    superficieUsada,
    fuenteSuperficie,
    medianaMercadoUfM2,
    p25UfM2,
    p75UfM2,
    factorEdad,
    factorCalidad,
    factorDisposicion,
    factorTotal,
    sujeto_ufM2,
    valorEstimadoUf,
    valorMinUf,
    valorMaxUf,
    nivelConfianza: nivelConfianza(comparablesValidos.length),
    comparablesUsados: comparablesValidos.length,
    comparables: comparablesValidos,
  };
}
