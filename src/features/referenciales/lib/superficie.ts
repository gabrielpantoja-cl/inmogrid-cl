import type { Referencial } from './api';
import { tipoSuperficiePrimaria } from './destino';

export type FuenteSuperficie = 'terreno' | 'construida';
export type ConfianzaSuperficie = 'alta' | 'fallback';

export interface SuperficieRelevante {
  valor: number | null;
  fuente: FuenteSuperficie | null;
  /**
   * `alta` = el campo elegido coincide con `tipoSuperficiePrimaria(destino)`.
   * `fallback` = caímos a la otra superficie por NULL en la primaria, o no
   * había superficie alguna disponible (`valor: null`).
   */
  confianza: ConfianzaSuperficie;
}

/**
 * Selecciona la superficie semánticamente correcta para un referencial,
 * usando `destino` como guía. Cuando no hay split disponible (~34% de
 * records pre-migración aún sin re-procesar) devuelve `valor: null` —
 * los consumidores deben mostrar "—" o equivalente.
 *
 * Reglas:
 *   1. Destino ∈ DESTINOS_TERRENO → preferir `superficieTerreno`
 *   2. Destino ∈ DESTINOS_HORIZONTALES → preferir `superficieConstruida`
 *   3. Destino === 'H' (mixto) → terreno si está, sino construida
 *   4. Destino desconocido o split en NULL → `valor: null`
 */
export function getSuperficieRelevante(
  r: Pick<Referencial, 'destino' | 'superficieTerreno' | 'superficieConstruida'>
): SuperficieRelevante {
  const tipo = tipoSuperficiePrimaria(r.destino);
  const t = r.superficieTerreno;
  const c = r.superficieConstruida;

  if (tipo === 'terreno' && typeof t === 'number') {
    return { valor: t, fuente: 'terreno', confianza: 'alta' };
  }
  if (tipo === 'construida' && typeof c === 'number') {
    return { valor: c, fuente: 'construida', confianza: 'alta' };
  }
  if (tipo === 'mixto') {
    if (typeof t === 'number') return { valor: t, fuente: 'terreno', confianza: 'alta' };
    if (typeof c === 'number') return { valor: c, fuente: 'construida', confianza: 'alta' };
  }
  return { valor: null, fuente: null, confianza: 'fallback' };
}

export type TipoValorUnitario = 'UF/m² terreno' | 'UF/m² construido';

export interface ValorUnitario {
  tipo: TipoValorUnitario;
  uf: number | null;
  clp: number | null;
  superficie: number;
  fuente: 'terreno' | 'construida';
}

/**
 * Calcula UF/m² (y CLP/m² para referencia) usando la superficie correcta
 * según destino. Devuelve null cuando:
 *   - No hay superficie semánticamente clara (split en NULL)
 *   - No hay ni monto CLP ni montoUf
 *
 * Preferí UF/m² para comparar entre años — CLP/m² no está ajustado por
 * inflación. La UI debería etiquetar el CLP como "valor histórico".
 */
export function valorUnitario(
  r: Pick<Referencial, 'destino' | 'superficieTerreno' | 'superficieConstruida' | 'monto' | 'montoRaw' | 'montoUf'>
): ValorUnitario | null {
  const sup = getSuperficieRelevante(r);
  if (sup.fuente !== 'terreno' && sup.fuente !== 'construida') return null;
  if (sup.valor === null || sup.valor <= 0) return null;

  const clpRaw = r.montoRaw ? Number(r.montoRaw) : null;
  const clp = clpRaw !== null && Number.isFinite(clpRaw) && clpRaw > 0 ? clpRaw : null;
  const uf = typeof r.montoUf === 'number' && r.montoUf > 0 ? r.montoUf : null;

  if (clp === null && uf === null) return null;

  return {
    tipo: sup.fuente === 'terreno' ? 'UF/m² terreno' : 'UF/m² construido',
    uf: uf !== null ? uf / sup.valor : null,
    clp: clp !== null ? clp / sup.valor : null,
    superficie: sup.valor,
    fuente: sup.fuente,
  };
}
