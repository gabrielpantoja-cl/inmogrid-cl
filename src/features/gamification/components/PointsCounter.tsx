'use client';

interface PointsCounterProps {
  points: number;
  compact?: boolean;
}

export function PointsCounter({ points, compact = false }: PointsCounterProps) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 1l2.39 4.84L18 6.74l-4 3.9.94 5.5L10 13.47l-4.94 2.67.94-5.5-4-3.9 5.61-.9L10 1z" />
        </svg>
        {points.toLocaleString('es-CL')}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
        <svg className="w-5 h-5 text-primary" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 1l2.39 4.84L18 6.74l-4 3.9.94 5.5L10 13.47l-4.94 2.67.94-5.5-4-3.9 5.61-.9L10 1z" />
        </svg>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{points.toLocaleString('es-CL')}</div>
        <div className="text-xs text-gray-500">puntos</div>
      </div>
    </div>
  );
}
