import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleOptions } from '@/shared/lib/cors';
import { MapDataQueryParamsSchema } from '@/shared/lib/schemas/referencial';
import { queryMapData } from '@/shared/lib/queries/referenciales';
import { applyRateLimit } from '@/shared/lib/ratelimit';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rl = await applyRateLimit(request);
    if (rl?.response?.status === 429) return rl.response;
    const rlHeaders = rl?.headers ?? {};

    const { searchParams } = request.nextUrl;

    const parsed = MapDataQueryParamsSchema.safeParse({
      comuna: searchParams.get('comuna') || undefined,
      anio: searchParams.get('anio') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos', details: parsed.error.issues },
        { status: 400, headers: corsHeaders() }
      );
    }

    const { comuna, anio, limit } = parsed.data;
    const { data, total, dbTotal } = await queryMapData({ comuna, anio, limit });

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
          },
          timestamp: new Date().toISOString(),
          center: [-33.4489, -70.6693] as [number, number],
          defaultZoom: 10,
          attribution: 'inmogrid.cl — Datos abiertos de transacciones inmobiliarias',
          apiVersion: 'v1',
        },
      },
      {
        headers: {
          ...corsHeaders(),
          ...rlHeaders,
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[API v1] map-data error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
