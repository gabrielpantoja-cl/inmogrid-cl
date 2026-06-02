'use client';

import type { ColumnDef, RowData } from '@tanstack/react-table';
import TruncatedCell from './TruncatedCell';
import SuspicionBadge from './SuspicionBadge';
import type { TableRow } from './actions';
import { destinoLabel } from '@/features/referenciales/lib/destino';

function formatM2(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('es-CL')} m²`;
}

function formatUF(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 2 })} UF`;
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    onReport?: (row: TableRow) => void;
    viewerRole?: string;
  }
}

export const tableColumns: ColumnDef<TableRow>[] = [
  {
    accessorKey: 'suspicion',
    header: () => <span className="whitespace-nowrap">Estado</span>,
    cell: ({ row, table }) => (
      <SuspicionBadge
        suspicion={row.original.suspicion}
        onReport={() => table.options.meta?.onReport?.(row.original)}
      />
    ),
  },
  {
    accessorKey: 'comuna',
    header: 'Comuna',
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-medium text-gray-900">
        {row.original.comuna ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'predio',
    header: 'Predio',
    cell: ({ row }) => (
      <TruncatedCell value={row.original.predio} ariaLabel="Ver predio completo" />
    ),
  },
  {
    accessorKey: 'rol',
    header: 'ROL',
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-gray-700">
        {row.original.rol ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'fechaescritura',
    header: 'Escritura',
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-gray-600">
        {row.original.fechaescritura ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'superficieTerreno',
    header: () => <span className="block text-right">Terreno</span>,
    cell: ({ row }) => (
      <span className="block whitespace-nowrap text-right text-gray-700">
        {formatM2(row.original.superficieTerreno)}
      </span>
    ),
  },
  {
    accessorKey: 'superficieConstruida',
    header: () => <span className="block text-right">Construida</span>,
    cell: ({ row }) => (
      <span className="block whitespace-nowrap text-right text-gray-700">
        {formatM2(row.original.superficieConstruida)}
      </span>
    ),
  },
  {
    accessorKey: 'destino',
    header: 'Destino',
    cell: ({ row }) => {
      const code = row.original.destino;
      const label = destinoLabel(code);
      if (!code) return <span className="text-gray-400">—</span>;
      return (
        <span
          className="whitespace-nowrap text-xs text-gray-700"
          title={label ?? `Código desconocido: ${code}`}
        >
          {label ?? code}
        </span>
      );
    },
  },
  {
    accessorKey: 'monto',
    header: () => <span className="block text-right">Monto (CLP)</span>,
    cell: ({ row }) => (
      <span className="block whitespace-nowrap text-right font-semibold text-gray-900">
        {row.original.monto ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'montoUf',
    header: () => <span className="block text-right">Monto (UF)</span>,
    cell: ({ row }) => (
      <span className="block whitespace-nowrap text-right text-gray-700">
        {formatUF(row.original.montoUf)}
      </span>
    ),
  },
  {
    accessorKey: 'comprador',
    header: 'Comprador',
    cell: ({ row }) => (
      <TruncatedCell
        value={row.original.comprador}
        ariaLabel="Ver comprador completo"
        maxWidthClass="max-w-[180px]"
      />
    ),
  },
  {
    accessorKey: 'vendedor',
    header: 'Vendedor',
    cell: ({ row }) => (
      <TruncatedCell
        value={row.original.vendedor}
        ariaLabel="Ver vendedor completo"
        maxWidthClass="max-w-[180px]"
      />
    ),
  },
  {
    accessorKey: 'cbr',
    header: 'CBR',
    cell: ({ row }) => (
      <TruncatedCell
        value={row.original.cbr}
        ariaLabel="Ver CBR completo"
        maxWidthClass="max-w-[180px]"
      />
    ),
  },
  {
    accessorKey: 'observaciones',
    header: 'Observaciones',
    cell: ({ row }) => (
      <TruncatedCell
        value={row.original.observaciones}
        ariaLabel="Ver observaciones completas"
        maxWidthClass="max-w-[280px]"
      />
    ),
  },
];
