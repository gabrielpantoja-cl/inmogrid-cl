/**
 * Cliente HTTP para los endpoints públicos de referenciales.
 *
 * Los endpoints `/api/v1/*` exponen datos de transacciones inmobiliarias
 * (CBR, fojas, ROL, monto, superficies split por destino, coordenadas
 * PostGIS). Son GET, sin autenticación y con CORS abierto. Rate limit:
 * 60 req/min (anónimo).
 *
 * Docs: /api/v1/docs
 */

/**
 * Base URL — por defecto apunta al API interno del propio deploy.
 * Se puede overridear con `NEXT_PUBLIC_REFERENCIALES_API_BASE` si alguien
 * quiere apuntar un cliente externo a este backend.
 */
export const REFERENCIALES_API_BASE =
  process.env.NEXT_PUBLIC_REFERENCIALES_API_BASE ?? '/api/v1';

export interface Referencial {
  id: string;
  lat: number;
  lng: number;
  fojas?: string;
  numero?: number;
  anio?: number;
  cbr?: string;
  predio?: string;
  comuna?: string;
  rol?: string;
  fechaescritura?: string;
  /** m² del lote. NULL en propiedades horizontales (deptos, of., parking, bodega). */
  superficieTerreno?: number;
  /** m² construidos. NULL en sitios eriazos / terrenos puros. */
  superficieConstruida?: number;
  /**
   * Código de destino (1 letra) — H, W, C, A, Z, L, O, I, F, B, D, E, G, M, P, Q, S, T, V.
   * Diccionario completo en `features/referenciales/lib/destino.ts`.
   */
  destino?: string;
  /** Monto en UF (cuando la fuente lo provee). NULL si no disponible. */
  montoUf?: number;
  /** Monto ya formateado como string en CLP, ej: "$150.000.000" */
  monto?: string;
  /**
   * Monto sin formato (string numérico, ej "150000000"). Solo presente
   * cuando la respuesta viene de la API autenticada — habilita analíticas
   * cliente sin re-parsear la cadena formateada.
   */
  montoRaw?: string;
  observaciones?: string;
}

export interface MapDataResponse {
  success: boolean;
  data: Referencial[];
  metadata: {
    total: number;
    /** Total real de registros en la BD (sin LIMIT aplicado) */
    dbTotal?: number;
    filters: { comuna: string | null; anio: number | null; limit: number | null };
    timestamp: string;
    center: [number, number];
    defaultZoom: number;
    attribution?: string;
  };
}

export interface ComunasResponse {
  success: boolean;
  data: Array<{ comuna: string; count: number }>;
  metadata: { total: number; distinct: number; timestamp: string };
}

export type MapDataFilters = {
  comuna?: string;
  anio?: number;
  limit?: number;
};

/**
 * Filtros extendidos — solo para la API autenticada
 * (`/api/referenciales/map-data`). Todas las props opcionales: si no se
 * incluyen, el servidor no aplica esa condición.
 *
 * `fechaDesde`/`fechaHasta` aceptan tanto `Date` como `string` ISO — se
 * serializan a ISO para el query string.
 * `bbox` = `[minLng, minLat, maxLng, maxLat]`.
 */
export type MapDataExtendedFilters = MapDataFilters & {
  fechaDesde?: Date | string;
  fechaHasta?: Date | string;
  montoMin?: number;
  montoMax?: number;
  superficieTerrenoMin?: number;
  superficieTerrenoMax?: number;
  superficieConstruidaMin?: number;
  superficieConstruidaMax?: number;
  q?: string;
  bbox?: [number, number, number, number];
};

function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const base = `${REFERENCIALES_API_BASE}${path}`;

  // For relative URLs (/api/v1/...), use string concatenation + URLSearchParams
  if (!base.startsWith('http')) {
    const sp = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
      }
    }
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  }

  // For absolute URLs (external API fallback)
  const url = new URL(base);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') || '5');
    const wait = Math.min(retryAfter, 30) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return fetch(url, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    });
  }
  return res;
}

export async function fetchReferenciales(
  filters: MapDataFilters = {},
  init?: RequestInit
): Promise<MapDataResponse> {
  const res = await fetchWithRetry(buildUrl('/map-data', filters), init);
  if (!res.ok) {
    if (res.status === 429) throw new Error('Demasiadas solicitudes. Intenta en unos segundos.');
    throw new Error(`/map-data respondió ${res.status}`);
  }
  return (await res.json()) as MapDataResponse;
}

export async function fetchComunas(init?: RequestInit): Promise<ComunasResponse> {
  const res = await fetchWithRetry(buildUrl('/map-data/comunas'), init);
  if (!res.ok) {
    if (res.status === 429) throw new Error('Demasiadas solicitudes. Intenta en unos segundos.');
    throw new Error(`/map-data/comunas respondió ${res.status}`);
  }
  return (await res.json()) as ComunasResponse;
}

/**
 * Base URL de la API autenticada (interna, same-origin). No se configura
 * por env var porque vive dentro del mismo Next.js — no hay fallback a
 * un host externo (a diferencia de REFERENCIALES_API_BASE).
 */
const REFERENCIALES_AUTH_API_BASE = '/api/referenciales';

/**
 * Serializa filtros extendidos a query string. `Date` se convierte a ISO;
 * `bbox` se junta con coma; valores vacíos se omiten.
 */
function buildAuthUrl(
  path: string,
  params?: MapDataExtendedFilters
): string {
  const sp = new URLSearchParams();
  if (params) {
    const entries: Array<[string, string | number | undefined | null]> = [
      ['comuna', params.comuna],
      ['anio', params.anio],
      ['limit', params.limit],
      ['montoMin', params.montoMin],
      ['montoMax', params.montoMax],
      ['superficieTerrenoMin', params.superficieTerrenoMin],
      ['superficieTerrenoMax', params.superficieTerrenoMax],
      ['superficieConstruidaMin', params.superficieConstruidaMin],
      ['superficieConstruidaMax', params.superficieConstruidaMax],
      ['q', params.q],
      [
        'fechaDesde',
        params.fechaDesde
          ? params.fechaDesde instanceof Date
            ? params.fechaDesde.toISOString()
            : params.fechaDesde
          : undefined,
      ],
      [
        'fechaHasta',
        params.fechaHasta
          ? params.fechaHasta instanceof Date
            ? params.fechaHasta.toISOString()
            : params.fechaHasta
          : undefined,
      ],
      ['bbox', params.bbox ? params.bbox.join(',') : undefined],
    ];
    for (const [k, v] of entries) {
      if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  return qs ? `${REFERENCIALES_AUTH_API_BASE}${path}?${qs}` : `${REFERENCIALES_AUTH_API_BASE}${path}`;
}

/**
 * Fetch autenticado — golpea la API privada. Usa `credentials: 'include'`
 * para mandar la cookie de sesión de Supabase. Si el server devuelve 401,
 * tiramos un error descriptivo para que la UI pueda prompt de login.
 *
 * Mantenemos el wrapper `fetchWithRetry` (429-safe) por consistencia,
 * aunque bajo auth no se espera rate-limit.
 */
export async function fetchReferencialesAuth(
  filters: MapDataExtendedFilters = {},
  init?: RequestInit
): Promise<MapDataResponse> {
  const res = await fetchWithRetry(buildAuthUrl('/map-data', filters), {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });
  if (res.status === 401) {
    throw new Error('Sesión requerida para acceder a los datos completos.');
  }
  if (!res.ok) {
    throw new Error(`API autenticada /map-data respondió ${res.status}`);
  }
  return (await res.json()) as MapDataResponse;
}

export async function fetchComunasAuth(init?: RequestInit): Promise<ComunasResponse> {
  const res = await fetchWithRetry(buildAuthUrl('/map-data/comunas'), {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });
  if (res.status === 401) {
    throw new Error('Sesión requerida para acceder a los datos completos.');
  }
  if (!res.ok) {
    throw new Error(`API autenticada /map-data/comunas respondió ${res.status}`);
  }
  return (await res.json()) as ComunasResponse;
}

/**
 * Parsea un monto CLP formateado tipo "$150.000.000" a un número.
 * Devuelve null si no se puede parsear.
 */
export function parseMontoCLP(monto?: string): number | null {
  if (!monto) return null;
  const digits = monto.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

export function formatCLP(value: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}
