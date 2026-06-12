'use client';

import { useState } from 'react';
import AppraisalForm from '@/features/tasacion/components/AppraisalForm';
import AppraisalResult from '@/features/tasacion/components/AppraisalResult';
import type { AppraisalInput, AppraisalResult as TasacionResult } from '@/features/tasacion/lib/types';

export default function TasacionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [resultado, setResultado] = useState<TasacionResult | null>(null);
  const [inputActual, setInputActual] = useState<AppraisalInput | null>(null);
  const [geocode, setGeocode] = useState<{ lat: number; lng: number; label?: string } | undefined>();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: AppraisalInput) => {
    setIsLoading(true);
    setError(null);
    setResultado(null);
    setGeocode(undefined);

    try {
      const res = await fetch('/api/v1/tasacion/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        const msg =
          json.details?.sugerencia ??
          json.error ??
          'No hay datos suficientes para esta búsqueda.';
        setError(msg);
        return;
      }

      const { lat, lng, geocodeLabel, ...resultadoData } = json.data;
      setResultado(resultadoData);
      setInputActual(data);

      if (lat != null && lng != null) {
        setGeocode({ lat, lng, label: geocodeLabel });
      }
    } catch {
      setError('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <div className="mb-8 space-y-1 no-print">
        <h1 className="text-2xl font-bold tracking-tight">Tasación gratuita online</h1>
        <p className="text-muted-foreground text-sm">
          Estimación basada en transacciones reales del Conservador de Bienes Raíces de Chile.
          Ingresa los datos de la propiedad y obtendrás un rango de valor en UF.
        </p>
      </div>

      {resultado && inputActual ? (
        <AppraisalResult
          resultado={resultado}
          input={inputActual}
          geocode={geocode}
          onReset={() => {
            setResultado(null);
            setInputActual(null);
            setGeocode(undefined);
          }}
        />
      ) : (
        <>
          <AppraisalForm onSubmit={handleSubmit} isLoading={isLoading} />
          {error && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </>
      )}
    </main>
  );
}
