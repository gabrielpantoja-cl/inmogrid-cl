'use client';

import dynamic from 'next/dynamic';
import type { AppraisalResult } from '../lib/types';
import type { QualityType, ConservationStateType, DispositionType } from '../lib/coeficientes';
import { QUALITY_LABELS, CONSERVATION_LABELS, DISPOSITION_LABELS } from '../lib/coeficientes';
import { destinoLabel } from '../lib/destino';
import ComparablesTable from './ComparablesTable';

const ReportMap = dynamic(() => import('./ReportMap'), { ssr: false });

interface Props {
  resultado: AppraisalResult;
  input: {
    comuna: string;
    destino: string;
    direccion?: string;
    calidad?: QualityType;
    estadoConservacion?: ConservationStateType;
    disposicion?: DispositionType;
    anoConstruccion?: number;
    superficieTerreno?: number;
    superficieConstruida?: number;
  };
  geocode?: { lat: number; lng: number; label?: string };
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

export default function AppraisalResult({ resultado, input, geocode, onReset }: Props) {
  const confianzaClass = CONFIANZA_COLORS[resultado.nivelConfianza] ?? '';
  const hoy = new Date().toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print-area">
      {/* ── Cabecera del informe (visible en pantalla e impresión) ── */}
      <header className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo inmogrid.cl */}
            <img
              src="/images/inmogrid-icon.svg"
              alt="inmogrid.cl"
              className="h-10 w-10 print:h-12 print:w-12"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight">Informe de Tasación Referencial</h1>
              <p className="text-xs text-muted-foreground">inmogrid.cl · {hoy}</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-medium ${confianzaClass} no-print`}
          >
            {CONFIANZA_LABELS[resultado.nivelConfianza]} · {resultado.comparablesUsados} comparables
          </span>
        </div>
      </header>

      {/* ── Datos del inmueble ── */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Datos del inmueble</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
          <Dato label="Comuna" value={input.comuna} />
          <Dato label="Tipo de propiedad" value={destinoLabel(input.destino) ?? input.destino} />
          {input.direccion && <Dato label="Dirección" value={input.direccion} />}
          {input.superficieTerreno && (
            <Dato
              label="Sup. terreno"
              value={`${input.superficieTerreno.toLocaleString('es-CL')} m²`}
            />
          )}
          {input.superficieConstruida && (
            <Dato
              label="Sup. construida"
              value={`${input.superficieConstruida.toLocaleString('es-CL')} m²`}
            />
          )}
          {input.anoConstruccion && <Dato label="Año construcción" value={String(input.anoConstruccion)} />}
          {input.estadoConservacion && (
            <Dato label="Conservación" value={CONSERVATION_LABELS[input.estadoConservacion]} />
          )}
          {input.calidad && <Dato label="Calidad" value={QUALITY_LABELS[input.calidad]} />}
          {input.disposicion && (
            <Dato label="Disposición" value={DISPOSITION_LABELS[input.disposicion]} />
          )}
        </div>
      </section>

      {/* ── Mapa de ubicación ── */}
      {geocode ? (
        <section>
          <h2 className="text-sm font-semibold mb-2">Ubicación</h2>
          <ReportMap lat={geocode.lat} lng={geocode.lng} label={geocode.label} />
          {geocode.label && (
            <p className="mt-1 text-xs text-muted-foreground">{geocode.label}</p>
          )}
        </section>
      ) : (
        <section className="rounded-md border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          No se pudo determinar la ubicación geográfica precisa. La tasación se realizó usando datos de
          toda la comuna.
        </section>
      )}

      {/* ── Valor estimado ── */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Valor estimado</h2>
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-4xl font-bold tracking-tight">
            {formatUf(resultado.valorEstimadoUf)} UF
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Rango de mercado:{' '}
            <span className="font-medium text-foreground">{formatUf(resultado.valorMinUf)}</span>
            {' – '}
            <span className="font-medium text-foreground">{formatUf(resultado.valorMaxUf)}</span> UF
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Superficie considerada:{' '}
            {resultado.superficieUsada.toLocaleString('es-CL')} m² de {resultado.fuenteSuperficie}
          </p>
        </div>
      </section>

      {/* ── Estadísticos ── */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Indicadores de mercado</h2>
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
      </section>

      {/* ── Comparables ── */}
      {resultado.comparables?.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2">
            Transacciones comparables utilizadas ({resultado.comparablesUsados})
          </h2>
          <ComparablesTable comparables={resultado.comparables} />
        </section>
      )}

      {/* ── Disclaimer ── */}
      <p className="rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
        Estimación referencial basada en transacciones reales registradas en el Conservador de Bienes
        Raíces de Chile. No reemplaza una tasación o peritaje profesional. Los valores en UF
        corresponden a los montos de escritura de los últimos 24 meses.
      </p>

      {/* ── Acciones (no visibles en impresión) ── */}
      <div className="flex gap-3 no-print">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 12H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimir / Guardar PDF
        </button>
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
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium text-foreground">{value}</span>
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
