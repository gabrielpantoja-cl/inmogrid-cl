import type { ConservationStateType, QualityType, DispositionType } from './coeficientes';

export interface AppraisalInput {
  comuna: string;
  destino: string;
  direccion?: string;
  superficieTerreno?: number;
  superficieConstruida?: number;
  anoConstruccion?: number;
  estadoConservacion?: ConservationStateType;
  calidad?: QualityType;
  disposicion?: DispositionType;
}

export interface ComparableUsado {
  id: string;
  anio: number;
  fechaescritura: string;
  superficieTerreno: number | null;
  superficieConstruida: number | null;
  montoUf: number;
  ufM2: number;
  predio?: string;
  rol?: string;
}

export type NivelConfianza = 'bajo' | 'medio' | 'alto';

export interface AppraisalResult {
  // Superficie usada en el cálculo
  superficieUsada: number;
  fuenteSuperficie: 'terreno' | 'construida';

  // Estadísticos del mercado (UF/m²)
  medianaMercadoUfM2: number;
  p25UfM2: number;
  p75UfM2: number;

  // Factores de ajuste aplicados al sujeto
  factorEdad: number;       // Ross-Heidecke
  factorCalidad: number;
  factorDisposicion: number;
  factorTotal: number;

  // UF/m² ajustado del sujeto
  sujeto_ufM2: number;

  // Valores finales en UF
  valorEstimadoUf: number;   // = superficieUsada × sujeto_ufM2
  valorMinUf: number;        // = superficieUsada × p25UfM2
  valorMaxUf: number;        // = superficieUsada × p75UfM2

  nivelConfianza: NivelConfianza;
  comparablesUsados: number;
  comparables: ComparableUsado[];
}
