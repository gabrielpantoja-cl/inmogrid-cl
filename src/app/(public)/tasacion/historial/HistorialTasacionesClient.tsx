'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { destinoLabel } from '@/features/tasacion/lib/destino';

interface AppraisalRow {
  id: string;
  createdAt: string;
  comuna: string;
  destino: string;
  superficieTerreno: number | null;
  superficieConstruida: number | null;
  valorEstimadoUf: number | null;
  valorMinUf: number | null;
  valorMaxUf: number | null;
  nivelConfianza: string | null;
}

function formatUf(v: number) {
  return v.toLocaleString('es-CL', { maximumFractionDigits: 0 });
}

export default function HistorialTasacionesClient() {
  const [rows, setRows] = useState<AppraisalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tasacion')
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []))
      .catch(() => setError('Error al cargar el historial.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Cargando...</div>;
  }
  if (error) {
    return (
      <div className="p-8 text-center text-sm text-destructive">{error}</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mis tasaciones</h1>
        <Link
          href="/tasacion"
          className="text-sm text-primary underline underline-offset-4 hover:no-underline"
        >
          Nueva tasación
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border bg-muted/30 px-6 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Aún no tienes tasaciones guardadas.{' '}
            <Link href="/tasacion" className="underline underline-offset-4">
              Realiza tu primera tasación
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border bg-card p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-sm">{r.comuna}</p>
                  <p className="text-xs text-muted-foreground">
                    {destinoLabel(r.destino) ?? r.destino}
                    {r.superficieTerreno
                      ? ` · ${r.superficieTerreno.toLocaleString('es-CL')} m² terreno`
                      : ''}
                    {r.superficieConstruida
                      ? ` · ${r.superficieConstruida.toLocaleString('es-CL')} m² construida`
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  {r.valorEstimadoUf ? (
                    <p className="font-semibold">{formatUf(r.valorEstimadoUf)} UF</p>
                  ) : (
                    <p className="text-muted-foreground text-xs">Sin resultado</p>
                  )}
                  {r.valorMinUf && r.valorMaxUf && (
                    <p className="text-xs text-muted-foreground">
                      {formatUf(r.valorMinUf)} – {formatUf(r.valorMaxUf)} UF
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString('es-CL')}
                {r.nivelConfianza && ` · Confianza ${r.nivelConfianza}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
