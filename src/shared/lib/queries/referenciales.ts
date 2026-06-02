import { getNeonDb } from '@/shared/lib/neon';
import {
  MapPointRowSchema,
  ComunaCountSchema,
  type MapPointRow,
  type MapPointResponse,
  type ComunaCount,
} from '@/shared/lib/schemas/referencial';

/**
 * Formats a raw monto string (from BigInt::text) to CLP currency.
 * Input: "150000000" → Output: "$150.000.000"
 * Returns undefined if input is null/empty.
 */
export function formatMontoCLP(monto: string | null | undefined): string | undefined {
  if (!monto) return undefined;
  const num = Number(monto);
  if (!Number.isFinite(num)) return undefined;
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formats a Date to DD/MM/YYYY string (es-CL locale).
 */
export function formatFechaEscritura(fecha: Date | null | undefined): string | undefined {
  if (!fecha) return undefined;
  return fecha.toLocaleDateString('es-CL');
}

/**
 * Transforms a raw DB row into the API response format.
 * - monto: BigInt string → CLP formatted string
 * - fechaescritura: Date → DD/MM/YYYY
 * - Nulls become undefined (omitted from JSON)
 *
 * Cuando `includeRawMonto` es true, el campo `montoRaw` (string numérico
 * sin formato) viaja junto con `monto` — solo la API autenticada lo activa.
 */
function toResponsePoint(
  row: MapPointRow,
  options: { includeRawMonto?: boolean; includePII?: boolean } = {}
): MapPointResponse {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    ...(row.fojas && { fojas: row.fojas }),
    ...(row.numero != null && { numero: row.numero }),
    ...(row.anio != null && { anio: row.anio }),
    ...(row.cbr && { cbr: row.cbr }),
    ...(row.predio && { predio: row.predio }),
    ...(row.comuna && { comuna: row.comuna }),
    ...(row.rol && { rol: row.rol }),
    ...(row.fechaescritura && { fechaescritura: formatFechaEscritura(row.fechaescritura) }),
    ...(row.superficieTerreno != null && { superficieTerreno: row.superficieTerreno }),
    ...(row.superficieConstruida != null && { superficieConstruida: row.superficieConstruida }),
    ...(row.destino && { destino: row.destino }),
    ...(row.montoUf != null && { montoUf: row.montoUf }),
    ...(row.monto && { monto: formatMontoCLP(row.monto) }),
    ...(options.includeRawMonto && row.monto && { montoRaw: row.monto }),
    ...(row.observaciones && { observaciones: row.observaciones }),
    // PII solo se propaga si el caller lo pidió explícitamente. Sin flag,
    // comprador/vendedor nunca salen del módulo de queries, aunque la row
    // los contenga.
    ...(options.includePII && row.comprador && { comprador: row.comprador }),
    ...(options.includePII && row.vendedor && { vendedor: row.vendedor }),
  };
}

/**
 * Query map data from Neon with optional filters.
 * Uses PostGIS ST_X/ST_Y with fallback to lat/lng columns.
 * monto is cast to text in SQL to preserve BigInt precision.
 */
export async function queryMapData(params: {
  comuna?: string;
  anio?: number;
  limit?: number;
}): Promise<{ data: MapPointResponse[]; total: number; dbTotal: number }> {
  const { comuna, anio, limit = 20000 } = params;

  const sql = getNeonDb();

  // Run data query and total count in parallel for performance
  const [rows, countRows] = await Promise.all([
    sql`
      SELECT
        r.id,
        COALESCE(ST_Y(r.geom), r.lat) as lat,
        COALESCE(ST_X(r.geom), r.lng) as lng,
        r.fojas, r.numero, r.anio, c.nombre AS cbr, r.predio, r.comuna, r.rol,
        r.fechaescritura,
        r."superficieTerreno", r."superficieConstruida", r.destino, r."montoUf",
        r.monto::text as monto,
        r.observaciones
      FROM referenciales r
      LEFT JOIN conservadores c ON r."conservadorId" = c.id
      WHERE (COALESCE(ST_Y(r.geom), r.lat)) IS NOT NULL
        AND (COALESCE(ST_X(r.geom), r.lng)) IS NOT NULL
        AND COALESCE(ST_Y(r.geom), r.lat) BETWEEN -90 AND 90
        AND COALESCE(ST_X(r.geom), r.lng) BETWEEN -180 AND 180
        AND (${comuna ?? null}::text IS NULL OR LOWER(r.comuna) = LOWER(${comuna ?? null}))
        AND (${anio ?? null}::int IS NULL OR r.anio = ${anio ?? null})
      ORDER BY r.fechaescritura DESC
      LIMIT ${limit}
    `,
    sql`
      SELECT COUNT(*)::int as total
      FROM referenciales
      WHERE (COALESCE(ST_Y(geom), lat)) IS NOT NULL
        AND (COALESCE(ST_X(geom), lng)) IS NOT NULL
        AND COALESCE(ST_Y(geom), lat) BETWEEN -90 AND 90
        AND COALESCE(ST_X(geom), lng) BETWEEN -180 AND 180
        AND (${comuna ?? null}::text IS NULL OR LOWER(comuna) = LOWER(${comuna ?? null}))
        AND (${anio ?? null}::int IS NULL OR anio = ${anio ?? null})
    `,
  ]);

  const validated = rows.map((row) => MapPointRowSchema.parse(row));
  const data = validated.map((r) => toResponsePoint(r));
  const dbTotal = (countRows[0]?.total as number) ?? 0;

  return { data, total: data.length, dbTotal };
}

/**
 * Query map data from Neon con filtros avanzados — uso exclusivo de la
 * API autenticada (`/api/referenciales/map-data`).
 *
 * Extiende `queryMapData` añadiendo:
 *   - `fechaDesde` / `fechaHasta`: rango sobre `fechaescritura`.
 *   - `montoMin` / `montoMax`: rango sobre `monto::bigint`.
 *   - `superficieTerrenoMin` / `superficieTerrenoMax`: rango sobre
 *     `superficieTerreno` (post split 2026-04-29). Records con NULL
 *     quedan fuera — la UI debe avisar de la cobertura ~66%.
 *   - `superficieConstruidaMin` / `superficieConstruidaMax`: idem para
 *     `superficieConstruida`.
 *   - `bbox`: [minLng, minLat, maxLng, maxLat] — filtra geométricamente
 *     vía `ST_MakeEnvelope` + `ST_Contains`, con fallback a comparación
 *     directa sobre `lat`/`lng` si `geom IS NULL` (manteniendo el patrón
 *     COALESCE del resto del módulo).
 *   - `q`: match parcial case-insensitive sobre `predio` o `rol`.
 *   - `includeRawMonto`: si true, cada punto incluye `montoRaw` (string
 *     numérico sin formato) para analíticas/export sin re-parseo.
 *
 * Todos los filtros son opcionales; el patrón `${value ?? null}::type IS
 * NULL OR …` permite dejarlos sin bindear en el template tag sin romper
 * el parsing del query.
 */
export async function queryMapDataExtended(params: {
  comuna?: string;
  anio?: number;
  limit?: number;
  offset?: number;
  fechaDesde?: Date;
  fechaHasta?: Date;
  montoMin?: number;
  montoMax?: number;
  superficieTerrenoMin?: number;
  superficieTerrenoMax?: number;
  superficieConstruidaMin?: number;
  superficieConstruidaMax?: number;
  q?: string;
  bbox?: [number, number, number, number];
  includeRawMonto?: boolean;
  includePII?: boolean;
}): Promise<{ data: MapPointResponse[]; total: number; dbTotal: number }> {
  const {
    comuna,
    anio,
    limit = 50000,
    offset = 0,
    fechaDesde,
    fechaHasta,
    montoMin,
    montoMax,
    superficieTerrenoMin,
    superficieTerrenoMax,
    superficieConstruidaMin,
    superficieConstruidaMax,
    q,
    bbox,
    includeRawMonto = false,
    includePII = false,
  } = params;

  const sql = getNeonDb();

  // Extraer bbox a 4 bindings individuales para que postgres.js los trate
  // como `float8` explícitos; el pattern `(${minLng ?? null}::float8 IS NULL …)`
  // desactiva la cláusula entera cuando bbox no viene.
  const minLng = bbox?.[0] ?? null;
  const minLat = bbox?.[1] ?? null;
  const maxLng = bbox?.[2] ?? null;
  const maxLat = bbox?.[3] ?? null;

  // `q` se usa con ILIKE → escapamos los comodines `%` y `_` para que
  // un input del usuario no arme una query de prefix/wildcard no deseada.
  const qPattern = q
    ? `%${q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
    : null;

  const [rows, countRows] = await Promise.all([
    sql`
      SELECT
        r.id,
        COALESCE(ST_Y(r.geom), r.lat) as lat,
        COALESCE(ST_X(r.geom), r.lng) as lng,
        r.fojas, r.numero, r.anio, c.nombre AS cbr, r.predio, r.comuna, r.rol,
        r.fechaescritura,
        r."superficieTerreno", r."superficieConstruida", r.destino, r."montoUf",
        r.monto::text as monto,
        r.observaciones
        ${includePII ? sql`, r.comprador, r.vendedor` : sql``}
      FROM referenciales r
      LEFT JOIN conservadores c ON r."conservadorId" = c.id
      WHERE (COALESCE(ST_Y(r.geom), r.lat)) IS NOT NULL
        AND (COALESCE(ST_X(r.geom), r.lng)) IS NOT NULL
        AND COALESCE(ST_Y(r.geom), r.lat) BETWEEN -90 AND 90
        AND COALESCE(ST_X(r.geom), r.lng) BETWEEN -180 AND 180
        AND (${comuna ?? null}::text IS NULL OR LOWER(r.comuna) = LOWER(${comuna ?? null}))
        AND (${anio ?? null}::int IS NULL OR r.anio = ${anio ?? null})
        AND (${fechaDesde ?? null}::timestamp IS NULL OR r.fechaescritura >= ${fechaDesde ?? null})
        AND (${fechaHasta ?? null}::timestamp IS NULL OR r.fechaescritura <= ${fechaHasta ?? null})
        AND (${montoMin ?? null}::bigint IS NULL OR r.monto >= ${montoMin ?? null})
        AND (${montoMax ?? null}::bigint IS NULL OR r.monto <= ${montoMax ?? null})
        AND (${superficieTerrenoMin ?? null}::numeric IS NULL OR r."superficieTerreno" >= ${superficieTerrenoMin ?? null})
        AND (${superficieTerrenoMax ?? null}::numeric IS NULL OR r."superficieTerreno" <= ${superficieTerrenoMax ?? null})
        AND (${superficieConstruidaMin ?? null}::numeric IS NULL OR r."superficieConstruida" >= ${superficieConstruidaMin ?? null})
        AND (${superficieConstruidaMax ?? null}::numeric IS NULL OR r."superficieConstruida" <= ${superficieConstruidaMax ?? null})
        AND (
          ${qPattern}::text IS NULL
          OR r.predio ILIKE ${qPattern}
          OR r.rol ILIKE ${qPattern}
        )
        AND (
          ${minLng}::float8 IS NULL
          OR COALESCE(ST_X(r.geom), r.lng) BETWEEN ${minLng ?? null} AND ${maxLng ?? null}
        )
        AND (
          ${minLat}::float8 IS NULL
          OR COALESCE(ST_Y(r.geom), r.lat) BETWEEN ${minLat ?? null} AND ${maxLat ?? null}
        )
      ORDER BY r.fechaescritura DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*)::int as total
      FROM referenciales
      WHERE (COALESCE(ST_Y(geom), lat)) IS NOT NULL
        AND (COALESCE(ST_X(geom), lng)) IS NOT NULL
        AND COALESCE(ST_Y(geom), lat) BETWEEN -90 AND 90
        AND COALESCE(ST_X(geom), lng) BETWEEN -180 AND 180
        AND (${comuna ?? null}::text IS NULL OR LOWER(comuna) = LOWER(${comuna ?? null}))
        AND (${anio ?? null}::int IS NULL OR anio = ${anio ?? null})
        AND (${fechaDesde ?? null}::timestamp IS NULL OR fechaescritura >= ${fechaDesde ?? null})
        AND (${fechaHasta ?? null}::timestamp IS NULL OR fechaescritura <= ${fechaHasta ?? null})
        AND (${montoMin ?? null}::bigint IS NULL OR monto >= ${montoMin ?? null})
        AND (${montoMax ?? null}::bigint IS NULL OR monto <= ${montoMax ?? null})
        AND (${superficieTerrenoMin ?? null}::numeric IS NULL OR "superficieTerreno" >= ${superficieTerrenoMin ?? null})
        AND (${superficieTerrenoMax ?? null}::numeric IS NULL OR "superficieTerreno" <= ${superficieTerrenoMax ?? null})
        AND (${superficieConstruidaMin ?? null}::numeric IS NULL OR "superficieConstruida" >= ${superficieConstruidaMin ?? null})
        AND (${superficieConstruidaMax ?? null}::numeric IS NULL OR "superficieConstruida" <= ${superficieConstruidaMax ?? null})
        AND (
          ${qPattern}::text IS NULL
          OR predio ILIKE ${qPattern}
          OR rol ILIKE ${qPattern}
        )
        AND (
          ${minLng}::float8 IS NULL
          OR COALESCE(ST_X(geom), lng) BETWEEN ${minLng ?? null} AND ${maxLng ?? null}
        )
        AND (
          ${minLat}::float8 IS NULL
          OR COALESCE(ST_Y(geom), lat) BETWEEN ${minLat ?? null} AND ${maxLat ?? null}
        )
    `,
  ]);

  const validated = rows.map((row) => MapPointRowSchema.parse(row));
  const data = validated.map((r) => toResponsePoint(r, { includeRawMonto, includePII }));
  const dbTotal = (countRows[0]?.total as number) ?? 0;

  return { data, total: data.length, dbTotal };
}

/**
 * Query distinct comunas with their record count.
 * Ordered by count descending for relevance.
 */
export async function queryComunas(): Promise<ComunaCount[]> {
  const sql = getNeonDb();
  const rows = await sql`
    SELECT comuna, COUNT(*)::int as count
    FROM referenciales
    WHERE comuna IS NOT NULL
      AND comuna <> ''
      AND (COALESCE(ST_Y(geom), lat)) IS NOT NULL
      AND (COALESCE(ST_X(geom), lng)) IS NOT NULL
    GROUP BY comuna
    ORDER BY count DESC
  `;

  return rows.map((row) => ComunaCountSchema.parse(row));
}

export type ConservadorEntry = {
  id: string;
  nombre: string;
  direccion: string | null;
  comuna: string;
  region: string;
  telefono: string | null;
  email: string | null;
  sitioWeb: string | null;
  jurisdiccion: string[];
  transacciones: number;
};

/**
 * Query conservadores directory from Neon with transaction counts joined from referenciales.
 * Ordered by transaction count desc, then alphabetically.
 */
export async function queryConservadoresDirectory(): Promise<ConservadorEntry[]> {
  const sql = getNeonDb();
  const rows = await sql`
    SELECT
      c.id,
      c.nombre,
      c.direccion,
      c.comuna,
      c.region,
      c.telefono,
      c.email,
      c."sitioWeb"    AS "sitioWeb",
      c.jurisdiccion,
      COUNT(r.id)::int AS transacciones
    FROM conservadores c
    LEFT JOIN referenciales r ON r."conservadorId" = c.id
    GROUP BY c.id, c.nombre, c.direccion, c.comuna, c.region,
             c.telefono, c.email, c."sitioWeb", c.jurisdiccion
    ORDER BY transacciones DESC, c.nombre
  `;
  return rows.map((r) => ({
    id: r.id as string,
    nombre: r.nombre as string,
    direccion: r.direccion as string | null,
    comuna: r.comuna as string,
    region: r.region as string,
    telefono: r.telefono as string | null,
    email: r.email as string | null,
    sitioWeb: (r.sitioWeb as string | null) || null,
    jurisdiccion: (r.jurisdiccion as string[]) ?? [],
    transacciones: (r.transacciones as number) ?? 0,
  }));
}

/**
 * Query aggregate stats for the referenciales dataset.
 */
export async function queryReferencialStats(): Promise<{
  totalReferenciales: number;
  lastUpdate: string;
}> {
  const sql = getNeonDb();
  const [stats] = await sql`
    SELECT
      COUNT(*)::int as total,
      MAX("updatedAt") as last_update
    FROM referenciales
  `;

  return {
    totalReferenciales: stats.total ?? 0,
    lastUpdate: stats.last_update
      ? new Date(stats.last_update).toISOString()
      : new Date().toISOString(),
  };
}
