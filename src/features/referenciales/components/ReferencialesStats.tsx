'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { parseMontoCLP, formatCLP, type Referencial } from '../lib/api';

interface Props {
  referenciales: Referencial[];
}

export default function ReferencialesStats({ referenciales }: Props) {
  const stats = useMemo(() => {
    const montos = referenciales
      .map((r) => parseMontoCLP(r.monto))
      .filter((n): n is number => n !== null && n > 0);

    // Promedios separados por tipo de superficie (post split 2026-04-29).
    // Cuando un record tiene NULL en alguno de los campos split, NO se incluye
    // en el promedio respectivo — preferimos transparencia (N visible) sobre
    // estimaciones mezcladas con la columna legacy.
    const terrenos = referenciales
      .map((r) => r.superficieTerreno)
      .filter((n): n is number => typeof n === 'number' && n > 0);
    const construidas = referenciales
      .map((r) => r.superficieConstruida)
      .filter((n): n is number => typeof n === 'number' && n > 0);

    const total = referenciales.length;
    const avgMonto = montos.length
      ? montos.reduce((a, b) => a + b, 0) / montos.length
      : 0;
    const medianMonto = montos.length
      ? [...montos].sort((a, b) => a - b)[Math.floor(montos.length / 2)]
      : 0;
    const avgTerreno = terrenos.length
      ? terrenos.reduce((a, b) => a + b, 0) / terrenos.length
      : 0;
    const avgConstruida = construidas.length
      ? construidas.reduce((a, b) => a + b, 0) / construidas.length
      : 0;

    // Top comunas
    const byComuna = new Map<string, number>();
    for (const r of referenciales) {
      if (r.comuna) byComuna.set(r.comuna, (byComuna.get(r.comuna) ?? 0) + 1);
    }
    const topComunas = Array.from(byComuna.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([comuna, count]) => ({ comuna, count }));

    return {
      total,
      avgMonto,
      medianMonto,
      avgTerreno,
      countTerreno: terrenos.length,
      avgConstruida,
      countConstruida: construidas.length,
      numComunas: byComuna.size,
      topComunas,
    };
  }, [referenciales]);

  const Metric = ({
    label,
    value,
    note,
  }: {
    label: string;
    value: string;
    note?: string;
  }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{value}</div>
      {note && <div className="mt-0.5 text-[10px] text-gray-400">{note}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Total registros" value={stats.total.toLocaleString('es-CL')} />
        <Metric label="Monto promedio" value={stats.avgMonto ? formatCLP(stats.avgMonto) : '—'} />
        <Metric
          label="Sup. terreno prom."
          value={stats.avgTerreno ? `${stats.avgTerreno.toFixed(0)} m²` : '—'}
          note={
            stats.countTerreno > 0
              ? `n=${stats.countTerreno.toLocaleString('es-CL')} con dato`
              : undefined
          }
        />
        <Metric
          label="Sup. construida prom."
          value={stats.avgConstruida ? `${stats.avgConstruida.toFixed(0)} m²` : '—'}
          note={
            stats.countConstruida > 0
              ? `n=${stats.countConstruida.toLocaleString('es-CL')} con dato`
              : undefined
          }
        />
        <Metric label="Monto mediano" value={stats.medianMonto ? formatCLP(stats.medianMonto) : '—'} />
        <Metric
          label="Comunas con datos"
          value={stats.numComunas > 0 ? stats.numComunas.toLocaleString('es-CL') : '—'}
        />
      </div>

      {stats.topComunas.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm font-medium text-gray-900 mb-2">Top comunas</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topComunas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="comuna" width={100} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#eab308" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
