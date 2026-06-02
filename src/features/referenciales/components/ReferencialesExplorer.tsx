'use client';

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  fetchReferenciales,
  fetchComunas,
  fetchReferencialesAuth,
  fetchComunasAuth,
  parseMontoCLP,
  type Referencial,
} from '../lib/api';
import { downloadCSV } from '../lib/csv';
import ReferencialesStats from './ReferencialesStats';

const ReferencialesMap = dynamic(() => import('./ReferencialesMap'), {
  ssr: false,
  loading: () => <MapLoadingOverlay label="Cargando mapa…" />,
});

function MapLoadingOverlay({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0 z-[1001] flex flex-col items-center justify-center gap-4 bg-white/70 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <svg
        className="h-12 w-12 animate-spin text-yellow-500"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          className="opacity-25"
        />
        <path
          fill="currentColor"
          className="opacity-90"
          d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
        />
      </svg>
      <span className="text-base font-semibold text-gray-800">{label}</span>
    </div>
  );
}

type Comuna = { comuna: string; count: number };

export type ExplorerMode = 'public' | 'authenticated';

interface Props {
  /**
   * `public` — usa `/api/v1/map-data` (rate-limited, CAP 50k, sin filtros avanzados).
   * `authenticated` — usa `/api/referenciales/map-data` (sin rate-limit, CAP 200k,
   * filtros avanzados, export CSV, badge visible).
   */
  mode: ExplorerMode;
  /** Callback para reportar datos dudosos. Solo se usa en modo auth. */
  onReport?: (r: Referencial) => void;
  /** Contenido opcional antes de los filtros (ej: H1 + intro). */
  header?: ReactNode;
  /** Contenido opcional después de la tabla (ej: disclaimer legal). */
  footer?: ReactNode;
}

/**
 * Experiencia unificada del mapa de referenciales.
 *
 * ## Modelo de carga (2026-04-24)
 *
 * Fetch **único** al montar el componente. Todos los filtros se aplican
 * client-side sobre el array cargado — zero refetches en el resto de la
 * sesión (excepto que cambie `isAuth`, lo cual no ocurre dentro del mismo
 * componente).
 *
 * Razones:
 * - El dataset cabe en memoria (84k × ~200 bytes gzip ≈ ~2MB). Una sola
 *   transferencia buena al inicio → navegación fluida después.
 * - `useMemo` con 12 filtros es trivialmente rápido en cliente (filter
 *   sobre 84k items < 10ms).
 * - Pan/zoom del mapa **no** dispara carga: antes lo hacía porque
 *   `mapBbox` estaba en las deps del filter builder, causando parpadeo
 *   y blur constante del overlay central.
 * - Supercluster client-side ya maneja los 84k puntos sin problema.
 *
 * ## Diferencias por modo
 * - `public`: cap 20.000 (protección + rate-limit del endpoint público).
 *   El user ve una muestra; un banner lo invita a loguearse para ver todo.
 * - `authenticated`: cap 100.000 (cubre el dataset completo de hoy, ~85k,
 *   más margen de crecimiento). Filtros avanzados (fechas, montos,
 *   superficie, búsqueda, bbox) son UI extra — todos client-side.
 */
export default function ReferencialesExplorer({
  mode,
  onReport,
  header,
  footer,
}: Props) {
  const isAuth = mode === 'authenticated';

  // `rawReferenciales` = dataset tal como vino del servidor. Inmutable
  // durante la sesión. `referenciales` (abajo, `useMemo`) es la versión
  // filtrada client-side que se pasa al mapa y a las stats.
  const [rawReferenciales, setRawReferenciales] = useState<Referencial[]>([]);
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbTotal, setDbTotal] = useState<number | null>(null);

  // Filtros base (ambos modos) — client-side
  const [selectedComuna, setSelectedComuna] = useState('');
  const [selectedAnio, setSelectedAnio] = useState('');

  // Filtros avanzados (solo modo auth) — todos client-side
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');
  const [terrenoMin, setTerrenoMin] = useState('');
  const [terrenoMax, setTerrenoMax] = useState('');
  const [construidaMin, setConstruidaMin] = useState('');
  const [construidaMax, setConstruidaMax] = useState('');
  const [q, setQ] = useState('');
  const [onlyVisibleArea, setOnlyVisibleArea] = useState(false);
  const [mapBbox, setMapBbox] = useState<[number, number, number, number] | null>(null);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => current - i);
  }, []);

  // Carga inicial de comunas (una vez por mount). En modo auth usa la
  // variante privada — mismo dataset, respuesta sin rate-limit.
  useEffect(() => {
    const fetcher = isAuth ? fetchComunasAuth : fetchComunas;
    fetcher()
      .then((res) => setComunas(res.data ?? []))
      .catch(() => setComunas([]));
  }, [isAuth]);

  // Fetch inicial único. Se dispara solo al montar o cuando cambia `isAuth`
  // (auth → logout → anon). Después de eso, zero requests al servidor.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetcher = isAuth
      ? fetchReferencialesAuth({ limit: 100000 })
      : fetchReferenciales({ limit: 20000 });

    fetcher
      .then((res) => {
        if (cancelled) return;
        setRawReferenciales(res.data ?? []);
        if (res.metadata.dbTotal != null) setDbTotal(res.metadata.dbTotal);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : 'No fue posible cargar los datos. Intenta nuevamente.'
        );
        setRawReferenciales([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuth]);

  // Filtrado client-side. Todos los criterios se aplican acá, sin tocar
  // el servidor. `useMemo` recomputa solo cuando cambia algún filtro o el
  // dataset crudo; con 84k items filter+filter+... corre en <10ms.
  const referenciales = useMemo(() => {
    let result = rawReferenciales;

    if (selectedComuna) {
      result = result.filter((r) => r.comuna === selectedComuna);
    }
    if (selectedAnio) {
      const y = Number(selectedAnio);
      result = result.filter((r) => r.anio === y);
    }
    if (fechaDesde) {
      const min = new Date(fechaDesde).getTime();
      result = result.filter(
        (r) => r.fechaescritura && new Date(r.fechaescritura).getTime() >= min
      );
    }
    if (fechaHasta) {
      const max = new Date(fechaHasta).getTime();
      result = result.filter(
        (r) => r.fechaescritura && new Date(r.fechaescritura).getTime() <= max
      );
    }
    if (montoMin) {
      const min = Number(montoMin);
      result = result.filter((r) => {
        const m = parseMontoCLP(r.monto);
        return m !== null && m >= min;
      });
    }
    if (montoMax) {
      const max = Number(montoMax);
      result = result.filter((r) => {
        const m = parseMontoCLP(r.monto);
        return m !== null && m <= max;
      });
    }
    // Filtros split (post 2026-04-29). Records con NULL en el campo
    // respectivo NO pasan el filtro — la UI muestra disclaimer de cobertura.
    if (terrenoMin) {
      const min = Number(terrenoMin);
      result = result.filter(
        (r) => typeof r.superficieTerreno === 'number' && r.superficieTerreno >= min
      );
    }
    if (terrenoMax) {
      const max = Number(terrenoMax);
      result = result.filter(
        (r) => typeof r.superficieTerreno === 'number' && r.superficieTerreno <= max
      );
    }
    if (construidaMin) {
      const min = Number(construidaMin);
      result = result.filter(
        (r) => typeof r.superficieConstruida === 'number' && r.superficieConstruida >= min
      );
    }
    if (construidaMax) {
      const max = Number(construidaMax);
      result = result.filter(
        (r) => typeof r.superficieConstruida === 'number' && r.superficieConstruida <= max
      );
    }
    if (q.trim()) {
      const qLower = q.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.predio ?? '').toLowerCase().includes(qLower) ||
          (r.rol ?? '').toLowerCase().includes(qLower) ||
          (r.comuna ?? '').toLowerCase().includes(qLower)
      );
    }
    if (onlyVisibleArea && mapBbox) {
      const [minLng, minLat, maxLng, maxLat] = mapBbox;
      result = result.filter(
        (r) =>
          r.lng >= minLng &&
          r.lng <= maxLng &&
          r.lat >= minLat &&
          r.lat <= maxLat
      );
    }

    return result;
  }, [
    rawReferenciales,
    selectedComuna,
    selectedAnio,
    fechaDesde,
    fechaHasta,
    montoMin,
    montoMax,
    terrenoMin,
    terrenoMax,
    construidaMin,
    construidaMax,
    q,
    onlyVisibleArea,
    mapBbox,
  ]);

  const clearAll = () => {
    setSelectedComuna('');
    setSelectedAnio('');
    setFechaDesde('');
    setFechaHasta('');
    setMontoMin('');
    setMontoMax('');
    setTerrenoMin('');
    setTerrenoMax('');
    setConstruidaMin('');
    setConstruidaMax('');
    setQ('');
    setOnlyVisibleArea(false);
  };

  const handleExport = () => {
    if (!referenciales.length) return;
    downloadCSV(referenciales, 'referenciales');
  };

  return (
    <div className="space-y-6">
      {header}

      {/* Filtros base */}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor={`explorer-comuna-${mode}`}
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Comuna
            </label>
            <select
              id={`explorer-comuna-${mode}`}
              value={selectedComuna}
              onChange={(e) => setSelectedComuna(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Todas las comunas</option>
              {comunas.map((c) => (
                <option key={c.comuna} value={c.comuna}>
                  {c.comuna} ({c.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`explorer-anio-${mode}`}
              className="block text-xs font-medium text-gray-700 mb-1"
            >
              Año
            </label>
            <select
              id={`explorer-anio-${mode}`}
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Todos los años</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={clearAll}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Limpiar filtros
            </button>
            {isAuth && (
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                aria-expanded={showAdvanced}
                className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {showAdvanced ? 'Ocultar avanzados' : 'Filtros avanzados'}
              </button>
            )}
          </div>
        </div>

        {/* Panel filtros avanzados — solo auth */}
        {isAuth && showAdvanced && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">
                  Fecha desde
                </span>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">
                  Fecha hasta
                </span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">
                  Monto mínimo (CLP)
                </span>
                <input
                  type="number"
                  min={0}
                  value={montoMin}
                  onChange={(e) => setMontoMin(e.target.value)}
                  placeholder="Ej: 100000000"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">
                  Monto máximo (CLP)
                </span>
                <input
                  type="number"
                  min={0}
                  value={montoMax}
                  onChange={(e) => setMontoMax(e.target.value)}
                  placeholder="Ej: 500000000"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
                <strong>Nota:</strong> los filtros de superficie aplican sobre los
                campos estructurados <em>terreno</em> y <em>construida</em>.
                Cobertura ≈66% (records pre-2026 sin destino quedan fuera hasta
                que el pipeline los re-procese).
              </div>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">
                  Sup. terreno mín (m²)
                </span>
                <input
                  type="number"
                  min={0}
                  value={terrenoMin}
                  onChange={(e) => setTerrenoMin(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">
                  Sup. terreno máx (m²)
                </span>
                <input
                  type="number"
                  min={0}
                  value={terrenoMax}
                  onChange={(e) => setTerrenoMax(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">
                  Sup. construida mín (m²)
                </span>
                <input
                  type="number"
                  min={0}
                  value={construidaMin}
                  onChange={(e) => setConstruidaMin(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-gray-700 mb-1">
                  Sup. construida máx (m²)
                </span>
                <input
                  type="number"
                  min={0}
                  value={construidaMax}
                  onChange={(e) => setConstruidaMax(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-xs font-medium text-gray-700 mb-1">
                Búsqueda libre (predio o ROL)
              </span>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ej: Fundo La Esperanza"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={onlyVisibleArea}
                onChange={(e) => setOnlyVisibleArea(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
              Solo registros en el área visible del mapa
              {onlyVisibleArea && !mapBbox && (
                <span className="text-xs text-gray-500">
                  (mueve el mapa para capturar el área)
                </span>
              )}
            </label>

            {/* Los filtros son reactivos — se aplican client-side a medida
                que el user escribe. No hay botón "Aplicar" porque no hay
                refetch al servidor. */}
          </div>
        )}

        {/* Contador de resultados. Único mensaje visible durante carga: el
            overlay central del mapa. Acá mostramos solo el resumen una vez
            que los datos llegan, para no duplicar el estado de loading. */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            {!loading && (
              <span>
                Mostrando{' '}
                <strong>{referenciales.length.toLocaleString('es-CL')}</strong> registros
                {rawReferenciales.length > 0 &&
                  referenciales.length !== rawReferenciales.length && (
                    <>
                      {' '}
                      (filtrados de{' '}
                      <strong>
                        {rawReferenciales.length.toLocaleString('es-CL')}
                      </strong>{' '}
                      cargados)
                    </>
                  )}
                {dbTotal != null && dbTotal > rawReferenciales.length && (
                  <>
                    {' · '}
                    <span className="text-gray-400">
                      muestra de{' '}
                      <strong>{dbTotal.toLocaleString('es-CL')}</strong> en
                      total
                    </span>
                  </>
                )}
              </span>
            )}
          </div>
          {isAuth && (
            <button
              type="button"
              onClick={handleExport}
              disabled={loading || referenciales.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                />
              </svg>
              Exportar CSV
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Invitación a autenticarse — solo en modo público */}
        {!isAuth && (
          <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800 flex flex-wrap items-center justify-between gap-3">
            <span>
              Inicia sesión para acceder a filtros avanzados (fechas, rangos de
              monto y superficie, búsqueda libre) y exportar a CSV.
            </span>
            <Link
              href="/auth/login"
              className="shrink-0 font-medium underline underline-offset-2 hover:text-yellow-900"
            >
              Acceder →
            </Link>
          </div>
        )}
      </section>

      {/* Mapa + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="relative h-[600px] overflow-hidden rounded-xl border border-gray-200 bg-white">
            <ReferencialesMap
              referenciales={referenciales}
              onReport={onReport}
              onBoundsChange={isAuth ? setMapBbox : undefined}
            />
            {loading && <MapLoadingOverlay label="Cargando referenciales…" />}
          </div>
        </div>

        <aside className="lg:col-span-1">
          <ReferencialesStats referenciales={referenciales} />
        </aside>
      </div>

      {footer}
    </div>
  );
}
