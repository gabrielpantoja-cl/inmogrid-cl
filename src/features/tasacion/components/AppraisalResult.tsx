'use client';

import type { AppraisalResult } from '../lib/types';
import type { QualityType, ConservationStateType } from '../lib/coeficientes';
import { QUALITY_LABELS, CONSERVATION_LABELS } from '../lib/coeficientes';
import { destinoLabel } from '../lib/destino';
import ComparablesTable from './ComparablesTable';

interface Props {
  resultado: AppraisalResult;
  input: {
    comuna: string;
    destino: string;
    calidad?: QualityType;
    estadoConservacion?: ConservationStateType;
    anoConstruccion?: number;
  };
  onReset?: () => void;
}

function formatUf(uf: number): string {
  return uf.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatUfM2(uf: number): string {
  return uf.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CONFIANZA_COLORS: Record<string, string> = {
  alto: 'bg-green-100 text-green-800 border-green-200',
  medio: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  bajo: 'bg-red-100 text-red-800 border-red-200',
};

const CONFIANZA_LABELS: Record<string, string> = {
  alto: 'Confianza alta',
  medio: 'Confianza media',
  bajo: 'Confianza baja',
};

export default function AppraisalResult({ resultado, input, onReset }: Props) {
  const confianzaClass = CONFIANZA_COLORS[resultado.nivelConfianza] ?? '';

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {input.comuna} · {destinoLabel(input.destino) ?? input.destino}
          </p>
          <p className="text-sm text-muted-foreground">
            {resultado.superficieUsada.toLocaleString('es-CL')} m² de {resultado.fuenteSuperficie}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-medium ${confianzaClass}`}
        >
          {CONFIANZA_LABELS[resultado.nivelConfianza]} · {resultado.comparablesUsados} comparables
        </span>
      </div>

      {/* Valor estimado principal */}
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="mb-1 text-sm text-muted-foreground">Valor estimado</p>
        <p className="text-4xl font-bold tracking-tight">
          {formatUf(resultado.valorEstimadoUf)} UF
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Rango de mercado:{' '}
          <span className="font-medium text-foreground">{formatUf(resultado.valorMinUf)}</span>
          {' – '}
          <span className="font-medium text-foreground">{formatUf(resultado.valorMaxUf)}</span> UF
        </p>
      </div>

      {/* Estadísticos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Mediana mercado" value={`${formatUfM2(resultado.medianaMercadoUfM2)} UF/m²`} />
        <Stat label="UF/m² ajustado" value={`${formatUfM2(resultado.sujeto_ufM2)} UF/m²`} />
        <Stat
          label="Factor edad/estado"
          value={`${(resultado.factorEdad * 100).toFixed(1)}%`}
          note={
            input.estadoConservacion
              ? CONSERVATION_LABELS[input.estadoConservacion]
              : 'Conservación normal'
          }
        />
        <Stat
          label="Factor calidad"
          value={`${(resultado.factorCalidad * 100).toFixed(1)}%`}
          note={input.calidad ? QUALITY_LABELS[input.calidad] : 'Media'}
        />
      </div>

      {/* Comparables */}
      {resultado.comparables?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Transacciones comparables usadas</h3>
          <ComparablesTable comparables={resultado.comparables} />
        </div>
      )}

      {/* Disclaimer */}
      <p className="rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
        Estimación referencial basada en transacciones reales registradas en el Conservador de Bienes
        Raíces de Chile. No reemplaza una tasación o peritaje profesional. Los valores en UF
        corresponden a los montos de escritura de los últimos 24 meses.
      </p>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Realizar otra tasación
        </button>
      )}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold text-sm">{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground truncate">{note}</p>}
    </div>
  );
}
