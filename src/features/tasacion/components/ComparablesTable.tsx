'use client';

import type { ComparableUsado } from '../lib/types';

interface Props {
  comparables: ComparableUsado[];
}

function formatUf(v: number) {
  return v.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatUfM2(v: number) {
  return v.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ComparablesTable({ comparables }: Props) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Fecha</th>
            <th className="px-3 py-2 text-right font-medium">Sup. m²</th>
            <th className="px-3 py-2 text-right font-medium">Monto (UF)</th>
            <th className="px-3 py-2 text-right font-medium">UF/m²</th>
            <th className="px-3 py-2 text-left font-medium">Fojas-Nº-Año</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {comparables.slice(0, 20).map((c) => {
            const sup = c.superficieTerreno ?? c.superficieConstruida ?? 0;
            const fna =
              c.fojas || c.numero || c.anio
                ? [c.fojas, c.numero ? String(c.numero) : null, c.anio ? String(c.anio) : null]
                    .filter(Boolean)
                    .join('-')
                : '—';
            return (
              <tr key={`${c.fechaescritura}-${c.fojas ?? ''}-${c.numero ?? c.anio}`} className="hover:bg-muted/30">
                <td className="px-3 py-2">{c.fechaescritura}</td>
                <td className="px-3 py-2 text-right">
                  {sup.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2 text-right">{formatUf(c.montoUf)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatUfM2(c.ufM2)}</td>
                <td className="px-3 py-2 text-muted-foreground">{fna}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {comparables.length > 20 && (
        <p className="px-3 py-2 text-center text-xs text-muted-foreground">
          Mostrando 20 de {comparables.length} comparables
        </p>
      )}
    </div>
  );
}
