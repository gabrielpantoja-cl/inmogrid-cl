'use server';

import { getUser, getProfile } from '@/shared/lib/supabase/auth';
import {
  queryMapDataExtended,
  queryComunas,
} from '@/shared/lib/queries/referenciales';
import { maskName, maskObservaciones } from '@/features/referenciales/lib/mask';
import {
  detectSuspicious,
  type SuspicionResult,
} from '@/features/referenciales/lib/flags';

export type TableFilters = {
  q?: string;
  comuna?: string;
  anio?: number;
  fechaDesde?: string; // ISO date
  fechaHasta?: string;
  montoMin?: number;
  montoMax?: number;
  /** Filtros split (post 2026-04-29). Cobertura ~66% de records con destino. */
  superficieTerrenoMin?: number;
  superficieTerrenoMax?: number;
  superficieConstruidaMin?: number;
  superficieConstruidaMax?: number;
};

export type TableRow = {
  id: string;
  lat: number;
  lng: number;
  comuna?: string;
  predio?: string;
  rol?: string;
  anio?: number;
  fechaescritura?: string;
  superficieTerreno?: number;
  superficieConstruida?: number;
  destino?: string;
  montoUf?: number;
  monto?: string;
  montoRaw?: string;
  cbr?: string;
  fojas?: string;
  numero?: number;
  observaciones?: string;
  comprador?: string; // masked según rol
  vendedor?: string; // masked según rol
  /** Resultado de detectSuspicious sobre esta fila. */
  suspicion: SuspicionResult;
};

export type TableResult = {
  data: TableRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** Rol del viewer — útil para que el cliente sepa si los valores están
   *  enmascarados o en claro (admin/superadmin los ven completos). */
  viewerRole: string;
};

const PAGE_SIZE = 30;

function parseDate(input?: string): Date | undefined {
  if (!input) return undefined;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Fetch paginado + enmascarado por rol de la tabla de referenciales.
 *
 * El masking se aplica ACÁ (server-side) — si el rol no es admin/superadmin,
 * comprador/vendedor/observaciones nunca viajan al cliente con su valor
 * original. Esto es más robusto que ocultar en UI.
 */
export async function fetchReferencialesTable(
  filters: TableFilters & { page?: number }
): Promise<TableResult> {
  const user = await getUser();
  if (!user?.id) {
    throw new Error('No autenticado');
  }
  const profile = await getProfile(user.id);
  const role = profile?.role ?? 'user';

  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  const { data, dbTotal } = await queryMapDataExtended({
    comuna: filters.comuna,
    anio: filters.anio,
    limit: PAGE_SIZE,
    offset,
    fechaDesde: parseDate(filters.fechaDesde),
    fechaHasta: parseDate(filters.fechaHasta),
    montoMin: filters.montoMin,
    montoMax: filters.montoMax,
    superficieTerrenoMin: filters.superficieTerrenoMin,
    superficieTerrenoMax: filters.superficieTerrenoMax,
    superficieConstruidaMin: filters.superficieConstruidaMin,
    superficieConstruidaMax: filters.superficieConstruidaMax,
    q: filters.q?.trim() || undefined,
    includeRawMonto: true,
    includePII: true,
  });

  const isPrivileged = role === 'admin' || role === 'superadmin';

  const rows: TableRow[] = data.map((d) => {
    const comprador = isPrivileged
      ? d.comprador
      : maskName(d.comprador ?? null) ?? undefined;
    const vendedor = isPrivileged
      ? d.vendedor
      : maskName(d.vendedor ?? null) ?? undefined;
    const observaciones = isPrivileged
      ? d.observaciones
      : maskObservaciones(d.observaciones ?? null) ?? undefined;

    return {
      id: d.id,
      lat: d.lat,
      lng: d.lng,
      comuna: d.comuna,
      predio: d.predio,
      rol: d.rol,
      anio: d.anio,
      fechaescritura: d.fechaescritura,
      superficieTerreno: d.superficieTerreno,
      superficieConstruida: d.superficieConstruida,
      destino: d.destino,
      montoUf: d.montoUf,
      monto: d.monto,
      montoRaw: d.montoRaw,
      cbr: d.cbr,
      fojas: d.fojas,
      numero: d.numero,
      observaciones,
      comprador,
      vendedor,
      suspicion: detectSuspicious({
        monto: d.monto,
        montoRaw: d.montoRaw,
        destino: d.destino,
        superficieTerreno: d.superficieTerreno,
        superficieConstruida: d.superficieConstruida,
        fechaescritura: d.fechaescritura,
        anio: d.anio,
        rol: d.rol,
      }),
    };
  });

  return {
    data: rows,
    page,
    pageSize: PAGE_SIZE,
    total: dbTotal,
    totalPages: Math.max(1, Math.ceil(dbTotal / PAGE_SIZE)),
    viewerRole: role,
  };
}

/**
 * Lista de comunas disponibles para el select del filtro.
 * Cacheada en memoria por 5 min via Neon driver (no se invalida aquí).
 */
export async function fetchTableComunas() {
  const user = await getUser();
  if (!user?.id) throw new Error('No autenticado');
  return queryComunas();
}
