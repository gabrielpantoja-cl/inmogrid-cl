'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/primitives/popover';
import {
  labelForFlag,
  type SuspicionResult,
} from '@/features/referenciales/lib/flags';

interface Props {
  suspicion: SuspicionResult;
  onReport?: () => void;
}

const LEVEL_STYLES: Record<SuspicionResult['level'], { ring: string; text: string; label: string }> = {
  none: { ring: '', text: '', label: '' },
  low: {
    ring: 'ring-yellow-300 bg-yellow-50 text-yellow-700',
    text: 'text-yellow-700',
    label: 'Revisar',
  },
  medium: {
    ring: 'ring-orange-300 bg-orange-50 text-orange-700',
    text: 'text-orange-700',
    label: 'Dudoso',
  },
  high: {
    ring: 'ring-red-300 bg-red-50 text-red-700',
    text: 'text-red-700',
    label: 'Sospechoso',
  },
};

export default function SuspicionBadge({ suspicion, onReport }: Props) {
  if (suspicion.level === 'none') {
    return <span className="text-xs text-gray-400">—</span>;
  }
  const styles = LEVEL_STYLES[suspicion.level];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${styles.label}: ${suspicion.flags.length} ${suspicion.flags.length === 1 ? 'alerta' : 'alertas'}`}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${styles.ring} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-yellow-400`}
        >
          <span aria-hidden>⚠</span>
          <span>{styles.label}</span>
          <span className="ml-0.5 rounded-full bg-white/60 px-1 text-[10px]">
            {suspicion.flags.length}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-80">
        <div className="space-y-3">
          <div>
            <h3 className={`text-sm font-semibold ${styles.text}`}>
              {styles.label}
            </h3>
            <p className="text-xs text-gray-500">
              Detectamos {suspicion.flags.length}{' '}
              {suspicion.flags.length === 1 ? 'posible inconsistencia' : 'posibles inconsistencias'}{' '}
              en este registro.
            </p>
          </div>
          <ul className="space-y-1.5 text-xs text-gray-700">
            {suspicion.flags.map((flag) => (
              <li key={flag} className="flex items-start gap-1.5">
                <span aria-hidden className="mt-0.5 text-red-500">
                  •
                </span>
                <span>{labelForFlag(flag)}</span>
              </li>
            ))}
          </ul>
          {onReport && (
            <button
              type="button"
              onClick={onReport}
              className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Reportar como dato dudoso
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
