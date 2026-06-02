import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/shared/lib/supabase/auth';
import { MapDataExtendedQueryParamsSchema } from '@/shared/lib/schemas/referencial';
import { queryMapDataExtended } from '@/shared/lib/queries/referenciales';

/**
 * GET /api/referenciales/map-data
 *
 * Endpoint AUTENTICADO sobre Neon. Contraparte privada de `/api/v1/map-data`:
 *   - Requiere sesión de Supabase (401 sin user).
 *   - Sin rate-limit (la sesión es el gate).
 *   - Sin CORS — same-origin, cookie-based.
 *   - Cache `no-store` — respuesta siempre fresca.
 *   - CAP de filas: 200 000 (vs 50 000 del público).
 *   - Filtros avanzados: fechaDesde/Hasta, montoMin/Max,
 *     superficieTerrenoMin/Max, superficieConstruidaMin/Max, bbox,
 *     búsqueda libre (`q` sobre predio/rol).
 *   - Cada punto incluye `montoRaw` (string numérico sin formato) para
 *     analíticas cliente sin re-parseo.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json(
      { success: false, error: 'No autenticado' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const { searchParams } = request.nextUrl;

    const parsed = MapDataExtendedQueryParamsSchema.safeParse({
      comuna: searchParams.get('comuna') || undefined,
      anio: searchParams.get('anio') || undefined,
      limit: searchParams.get('limit') || undefined,
      fechaDesde: searchParams.get('fechaDesde') || undefined,
      fechaHasta: searchParams.get('fechaHasta') || undefined,
      montoMin: searchParams.get('montoMin') || undefined,
      montoMax: searchParams.get('montoMax') || undefined,
      superficieTerrenoMin: searchParams.get('superficieTerrenoMin') || undefined,
      superficieTerrenoMax: searchParams.get('superficieTerrenoMax') || undefined,
      superficieConstruidaMin: searchParams.get('superficieConstruidaMin') || undefined,
      superficieConstruidaMax: searchParams.get('superficieConstruidaMax') || undefined,
      q: searchParams.get('q') || undefined,
      bbox: searchParams.get('bbox') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parámetros inválidos',
          details: parsed.error.issues,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const {
      comuna,
      anio,
      limit,
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
    } = parsed.data;

    const { data, total, dbTotal } = await queryMapDataExtended({
      comuna,
      anio,
      limit,
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
      includeRawMonto: true,
    });

    return NextResponse.json(
      {
        success: true,
        data,
        metadata: {
          total,
          dbTotal,
          filters: {
            comuna: comuna ?? null,
            anio: anio ?? null,
            limit: limit ?? null,
            fechaDesde: fechaDesde ? fechaDesde.toISOString() : null,
            fechaHasta: fechaHasta ? fechaHasta.toISOString() : null,
            montoMin: montoMin ?? null,
            montoMax: montoMax ?? null,
            superficieTerrenoMin: superficieTerrenoMin ?? null,
            superficieTerrenoMax: superficieTerrenoMax ?? null,
            superficieConstruidaMin: superficieConstruidaMin ?? null,
            superficieConstruidaMax: superficieConstruidaMax ?? null,
            q: q ?? null,
            bbox: bbox ?? null,
          },
          timestamp: new Date().toISOString(),
          center: [-33.4489, -70.6693] as [number, number],
          defaultZoom: 10,
          attribution: 'inmogrid.cl — Datos verificados (acceso autenticado)',
          authenticated: true,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[API auth] /api/referenciales/map-data error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
