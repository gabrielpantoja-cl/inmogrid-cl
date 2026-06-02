'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/primitives/popover';

const TRUNCATE_THRESHOLD = 45;

interface Props {
  value: string | null | undefined;
  /** Label opcional para screen readers (p.ej. "Ver predio completo"). */
  ariaLabel?: string;
  /** Ancho máximo del contenido truncado en la celda. */
  maxWidthClass?: string;
}

/**
 * Campo largo truncado con botón ⤢ que abre un popover con el texto completo.
 * Radix cierra el popover con click-outside y Escape por default.
 * Si el valor es corto o está vacío, se renderiza como texto normal sin botón.
 */
export default function TruncatedCell({
  value,
  ariaLabel = 'Ver contenido completo',
  maxWidthClass = 'max-w-[260px]',
}: Props) {
  if (!value) return <span className="text-gray-400">—</span>;

  const needsTruncation = value.length > TRUNCATE_THRESHOLD;
  if (!needsTruncation) {
    return (
      <span className={`block truncate ${maxWidthClass}`} title={value}>
        {value}
      </span>
    );
  }

  const preview = value.slice(0, TRUNCATE_THRESHOLD).trimEnd();

  return (
    <span className={`inline-flex items-center gap-1 ${maxWidthClass}`}>
      <span className="truncate">{preview}…</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-[10px] text-gray-600 hover:border-yellow-400 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            ⤢
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-96 max-w-[min(24rem,calc(100vw-2rem))]"
        >
          <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
            {value}
          </p>
        </PopoverContent>
      </Popover>
    </span>
  );
}
