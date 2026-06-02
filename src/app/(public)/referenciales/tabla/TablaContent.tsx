'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/primitives/table';
import { ReportModal, type Referencial } from '@/features/referenciales';
import { fetchReferencialesTable, fetchTableComunas } from './actions';
import type { TableResult, TableFilters, TableRow as TableRowData } from './actions';
import { tableColumns } from './columns';

/** Convierte una fila de la tabla a un Referencial (requerido por ReportModal). */
function rowToReferencial(r: TableRowData): Referencial {
  return {
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    fojas: r.fojas,
    numero: r.numero,
    anio: r.anio,
    cbr: r.cbr,
    predio: r.predio,
    comuna: r.comuna,
    rol: r.rol,
    fechaescritura: r.fechaescritura,
    superficieTerreno: r.superficieTerreno,
    superficieConstruida: r.superficieConstruida,
    destino: r.destino,
    montoUf: r.montoUf,
    monto: r.monto,
    montoRaw: r.montoRaw,
    observaciones: r.observaciones,
  };
}

type Comuna = { comuna: string; count: number };

/** Lee los filtros vigentes desde la URL. */
function readFiltersFromURL(
  sp: URLSearchParams
): TableFilters & { page: number } {
  const num = (key: string): number | undefined => {
    const raw = Number(sp.get(key) ?? '');
    return Number.isFinite(raw) && raw > 0 ? raw : undefined;
  };

  const pageRaw = Number(sp.get('page') ?? '1');

  return {
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    q: sp.get('q') ?? undefined,
    comuna: sp.get('comuna') ?? undefined,
    anio: num('anio'),
    fechaDesde: sp.get('fechaDesde') ?? undefined,
    fechaHasta: sp.get('fechaHasta') ?? undefined,
    montoMin: num('montoMin'),
    montoMax: num('montoMax'),
    superficieTerrenoMin: num('superficieTerrenoMin'),
    superficieTerrenoMax: num('superficieTerrenoMax'),
    superficieConstruidaMin: num('superficieConstruidaMin'),
    superficieConstruidaMax: num('superficieConstruidaMax'),
  };
}

/** Serializa filtros a query string omitiendo vacíos. */
function filtersToSearch(filters: TableFilters & { page: number }) {
  const sp = new URLSearchParams();
  if (filters.q) sp.set('q', filters.q);
  if (filters.comuna) sp.set('comuna', filters.comuna);
  if (filters.anio) sp.set('anio', String(filters.anio));
  if (filters.fechaDesde) sp.set('fechaDesde', filters.fechaDesde);
  if (filters.fechaHasta) sp.set('fechaHasta', filters.fechaHasta);
  if (filters.montoMin) sp.set('montoMin', String(filters.montoMin));
  if (filters.montoMax) sp.set('montoMax', String(filters.montoMax));
  if (filters.superficieTerrenoMin) sp.set('superficieTerrenoMin', String(filters.superficieTerrenoMin));
  if (filters.superficieTerrenoMax) sp.set('superficieTerrenoMax', String(filters.superficieTerrenoMax));
  if (filters.superficieConstruidaMin) sp.set('superficieConstruidaMin', String(filters.superficieConstruidaMin));
  if (filters.superficieConstruidaMax) sp.set('superficieConstruidaMax', String(filters.superficieConstruidaMax));
  if (filters.page > 1) sp.set('page', String(filters.page));
  return sp.toString();
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function TablaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Estado derivado de la URL (single source of truth para filtros)
  const current = useMemo(
    () => readFiltersFromURL(searchParams),
    [searchParams]
  );

  const [result, setResult] = useState<TableResult | null>(null);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reportTarget, setReportTarget] = useState<TableRowData | null>(null);

  // Campos "en edición" — se sincronizan a la URL al blur/enter/submit.
  // El texto libre tiene debounce de 400ms para no saturar la BD.
  const [qDraft, setQDraft] = useState(current.q ?? '');

  useEffect(() => {
    setQDraft(current.q ?? '');
  }, [current.q]);

  // Carga de comunas (una vez)
  useEffect(() => {
    fetchTableComunas()
      .then((list) =>
        setComunas(list.map((c) => ({ comuna: c.comuna, count: c.count })))
      )
      .catch(() => setComunas([]));
  }, []);

  // Fetch al cambiar cualquier parte de la URL vigente
  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchReferencialesTable(current)
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al cargar datos');
          setResult(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [current]);

  const updateUrl = useCallback(
    (nextFilters: Partial<TableFilters & { page: number }>) => {
      const merged = { ...current, ...nextFilters };
      // Cuando cambia cualquier filtro (no la página), volvemos a página 1.
      const pageChanged = Object.keys(nextFilters).length === 1 && 'page' in nextFilters;
      if (!pageChanged) merged.page = 1;

      const qs = filtersToSearch(merged);
      startTransition(() => {
        router.replace(`/referenciales/tabla${qs ? `?${qs}` : ''}`, {
          scroll: false,
        });
      });
    },
    [current, router]
  );

  // Debounce del input de búsqueda
  useEffect(() => {
    if (qDraft === (current.q ?? '')) return;
    const id = setTimeout(() => updateUrl({ q: qDraft || undefined }), 400);
    return () => clearTimeout(id);
  }, [qDraft, current.q, updateUrl]);

  const clearAll = () => {
    setQDraft('');
    startTransition(() => {
      router.replace('/referenciales/tabla', { scroll: false });
    });
  };

  const table = useReactTable({
    data: result?.data ?? [],
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: result?.totalPages ?? -1,
    meta: {
      onReport: (row) => setReportTarget(row),
      viewerRole: result?.viewerRole,
    },
  });

  const hasAdvancedFilters =
    !!current.fechaDesde ||
    !!current.fechaHasta ||
    !!current.montoMin ||
    !!current.montoMax ||
    !!current.superficieTerrenoMin ||
    !!current.superficieTerrenoMax ||
    !!current.superficieConstruidaMin ||
    !!current.superficieConstruidaMax;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tabla</h1>
          <p className="mt-1 text-gray-600">
            Vista tipo planilla. 30 registros por página · filtros combinables
            reflejados en la URL.
          </p>
        </div>
      </div>

      {result?.viewerRole === 'user' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <span className="font-medium text-gray-800">Privacidad:</span> los
          nombres de comprador y vendedor aparecen enmascarados (ej.{' '}
          <code className="rounded bg-white px-1 py-0.5 text-gray-800">
            J**n P***z
          </code>
          ) para proteger la identidad de las partes. Esto es parte del
          cumplimiento de la Ley 19.628 de protección de datos personales.
        </div>
      )}

      {/* Toolbar de filtros */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label
              htmlFor="tabla-q"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Buscar en predio o ROL
            </label>
            <input
              id="tabla-q"
              type="search"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Ej: Fundo La Esperanza"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label
              htmlFor="tabla-comuna"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Comuna
            </label>
            <select
              id="tabla-comuna"
              value={current.comuna ?? ''}
              onChange={(e) => updateUrl({ comuna: e.target.value || undefined })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Todas</option>
              {comunas.map((c) => (
                <option key={c.comuna} value={c.comuna}>
                  {c.comuna} ({c.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tabla-anio"
              className="mb-1 block text-xs font-medium text-gray-700"
            >
              Año
            </label>
            <select
              id="tabla-anio"
              value={current.anio ?? ''}
              onChange={(e) =>
                updateUrl({ anio: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Todos</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            {showAdvanced ? 'Ocultar avanzados' : 'Filtros avanzados'}
            {hasAdvancedFilters && !showAdvanced && (
              <span className="ml-1 inline-flex h-4 items-center rounded-full bg-yellow-500 px-1.5 text-[10px] font-semibold text-white">
                activos
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Limpiar filtros
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Fecha desde
                </span>
                <input
                  type="date"
                  defaultValue={current.fechaDesde ?? ''}
                  onBlur={(e) =>
                    updateUrl({ fechaDesde: e.target.value || undefined })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Fecha hasta
                </span>
                <input
                  type="date"
                  defaultValue={current.fechaHasta ?? ''}
                  onBlur={(e) =>
                    updateUrl({ fechaHasta: e.target.value || undefined })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <div />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Monto mínimo (CLP)
                </span>
                <input
                  type="number"
                  min={0}
                  defaultValue={current.montoMin ?? ''}
                  onBlur={(e) =>
                    updateUrl({
                      montoMin: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Monto máximo (CLP)
                </span>
                <input
                  type="number"
                  min={0}
                  defaultValue={current.montoMax ?? ''}
                  onBlur={(e) =>
                    updateUrl({
                      montoMax: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <div />
              <div className="md:col-span-3 -mb-1 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
                <strong>Nota:</strong> los filtros de superficie aplican sobre los
                campos estructurados <em>terreno</em> y <em>construida</em>.
                Cobertura actual ≈66% de los registros (los pre-2026 sin destino
                quedan fuera hasta que el pipeline los re-procese).
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Sup. terreno mín (m²)
                </span>
                <input
                  type="number"
                  min={0}
                  defaultValue={current.superficieTerrenoMin ?? ''}
                  onBlur={(e) =>
                    updateUrl({
                      superficieTerrenoMin: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Sup. terreno máx (m²)
                </span>
                <input
                  type="number"
                  min={0}
                  defaultValue={current.superficieTerrenoMax ?? ''}
                  onBlur={(e) =>
                    updateUrl({
                      superficieTerrenoMax: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <div />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Sup. construida mín (m²)
                </span>
                <input
                  type="number"
                  min={0}
                  defaultValue={current.superficieConstruidaMin ?? ''}
                  onBlur={(e) =>
                    updateUrl({
                      superficieConstruidaMin: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">
                  Sup. construida máx (m²)
                </span>
                <input
                  type="number"
                  min={0}
                  defaultValue={current.superficieConstruidaMax ?? ''}
                  onBlur={(e) =>
                    updateUrl({
                      superficieConstruidaMax: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Estado */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span aria-live="polite">
          {result
            ? `${result.total.toLocaleString('es-CL')} registros · página ${result.page} de ${result.totalPages}`
            : isPending
              ? 'Cargando…'
              : 'Sin datos'}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 && !isPending && !error && (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className="py-12 text-center text-sm text-gray-500"
                >
                  Sin registros para los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {isPending && (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center bg-white/40 pt-6">
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
              Cargando…
            </span>
          </div>
        )}
      </div>

      {/* Paginación */}
      <Pagination
        page={result?.page ?? 1}
        totalPages={result?.totalPages ?? 1}
        onPageChange={(p) => updateUrl({ page: p })}
        disabled={isPending}
      />

      {/* Modal de reporte — se abre desde el badge de sospecha */}
      {reportTarget && (
        <ReportModal
          referencial={rowToReferencial(reportTarget)}
          onClose={() => setReportTarget(null)}
          onSuccess={() => {
            setReportTarget(null);
            router.push('/referenciales/mis-aportes');
          }}
        />
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const windowSize = 5;
  const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), totalPages - windowSize + 1));
  const end = Math.min(totalPages, start + windowSize - 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav
      aria-label="Paginación de tabla de referenciales"
      className="flex flex-wrap items-center justify-between gap-2"
    >
      <button
        type="button"
        onClick={() => canPrev && onPageChange(page - 1)}
        disabled={!canPrev || disabled}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
      >
        ← Anterior
      </button>

      <ul className="flex flex-wrap items-center gap-1">
        {start > 1 && (
          <>
            <li>
              <button
                type="button"
                onClick={() => onPageChange(1)}
                disabled={disabled}
                className="h-8 min-w-[2rem] rounded-md px-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                1
              </button>
            </li>
            {start > 2 && <li aria-hidden className="px-1 text-gray-400">…</li>}
          </>
        )}
        {pages.map((p) => (
          <li key={p}>
            <button
              type="button"
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p)}
              disabled={disabled}
              className={`h-8 min-w-[2rem] rounded-md px-2 text-sm transition-colors ${
                p === page
                  ? 'bg-yellow-500 font-semibold text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          </li>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <li aria-hidden className="px-1 text-gray-400">
                …
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={() => onPageChange(totalPages)}
                disabled={disabled}
                className="h-8 min-w-[2rem] rounded-md px-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                {totalPages}
              </button>
            </li>
          </>
        )}
      </ul>

      <button
        type="button"
        onClick={() => canNext && onPageChange(page + 1)}
        disabled={!canNext || disabled}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
      >
        Siguiente →
      </button>
    </nav>
  );
}
