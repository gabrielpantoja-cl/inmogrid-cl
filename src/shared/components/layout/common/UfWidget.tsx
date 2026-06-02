'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/solid';

type UfPoint = { fecha: string; valor: number };
type UfPayload = {
  valor: number;
  fecha: string;
  source: string;
  serie: UfPoint[];
  cambio?: { absoluto: number; porcentaje: number; previa: UfPoint };
};

const formatCLP = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const formatDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });

/**
 * Easing cubic out — arranca rápido, desacelera al llegar al valor final.
 * Hace que la animación de count-up se sienta orgánica en vez de lineal.
 */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function useCountUp(target: number, durationMs = 800) {
  const [value, setValue] = useState(target);
  const previousRef = useRef(target);

  useEffect(() => {
    const start = previousRef.current;
    const delta = target - start;
    if (delta === 0) return;

    let rafId: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - t0) / durationMs);
      const eased = easeOutCubic(progress);
      setValue(start + delta * eased);
      if (progress < 1) rafId = requestAnimationFrame(tick);
      else previousRef.current = target;
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return value;
}

function Sparkline({ points, color }: { points: UfPoint[]; color: string }) {
  if (points.length < 2) return null;

  const width = 60;
  const height = 20;
  const values = points.map((p) => p.valor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p.valor - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
    </svg>
  );
}

export function UfWidget() {
  const [data, setData] = useState<UfPayload | null>(null);
  const [error, setError] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animatedValue = useCountUp(data?.valor ?? 0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/uf')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload: UfPayload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cierra el tooltip al hacer click fuera o presionar Escape.
  useEffect(() => {
    if (!tooltipOpen) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltipOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTooltipOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [tooltipOpen]);

  if (error) return null;
  if (!data) {
    return (
      <div className="hidden lg:flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 h-8 w-32 animate-pulse">
        <div className="h-3 w-full bg-gray-200 rounded" />
      </div>
    );
  }

  const cambioPct = data.cambio?.porcentaje ?? 0;
  const trendColor =
    cambioPct > 0.001 ? '#16a34a' : cambioPct < -0.001 ? '#dc2626' : '#6b7280';
  const TrendIcon =
    cambioPct > 0.001
      ? ArrowTrendingUpIcon
      : cambioPct < -0.001
      ? ArrowTrendingDownIcon
      : MinusIcon;

  return (
    <div className="relative hidden lg:block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setTooltipOpen((v) => !v)}
        aria-expanded={tooltipOpen}
        aria-label={`Valor UF ${formatCLP(data.valor)}`}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 transition-colors"
      >
        <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">UF</span>
        <span className="text-sm font-semibold tabular-nums text-gray-900">
          {formatCLP(animatedValue)}
        </span>
        {data.serie.length >= 2 && <Sparkline points={data.serie} color={trendColor} />}
        <TrendIcon className="w-3.5 h-3.5" style={{ color: trendColor }} />
      </button>

      {tooltipOpen && (
        <div
          role="tooltip"
          className="absolute right-0 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg z-50"
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              Unidad de Fomento
            </span>
            <span className="text-xs text-gray-500">{formatDateShort(data.fecha)}</span>
          </div>

          <div className="text-3xl font-bold text-gray-900 tabular-nums">
            {formatCLP(data.valor)}
          </div>

          {data.cambio && (
            <div className="mt-1 flex items-center gap-1 text-xs" style={{ color: trendColor }}>
              <TrendIcon className="w-3.5 h-3.5" />
              <span className="font-medium">
                {data.cambio.absoluto >= 0 ? '+' : ''}
                {data.cambio.absoluto.toFixed(2)} ({cambioPct >= 0 ? '+' : ''}
                {cambioPct.toFixed(3)}%)
              </span>
              <span className="text-gray-500">vs día anterior</span>
            </div>
          )}

          {data.serie.length >= 2 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-1">
                Últimos {data.serie.length} días
              </div>
              <div className="h-12">
                <SparklineLarge points={data.serie} color={trendColor} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1 tabular-nums">
                <span>{formatDateShort(data.serie[0].fecha)}</span>
                <span>{formatDateShort(data.serie[data.serie.length - 1].fecha)}</span>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
            Fuente: {data.source} · actualización diaria
          </div>
        </div>
      )}
    </div>
  );
}

function SparklineLarge({ points, color }: { points: UfPoint[]; color: string }) {
  const width = 240;
  const height = 48;
  const values = points.map((p) => p.valor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p.valor - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const linePath = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaSegments = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `M ${coords[0].x.toFixed(1)} ${height} ${areaSegments} L ${coords[coords.length - 1].x.toFixed(1)} ${height} Z`;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={areaPath} fill={color} fillOpacity="0.1" />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={linePath}
      />
    </svg>
  );
}
