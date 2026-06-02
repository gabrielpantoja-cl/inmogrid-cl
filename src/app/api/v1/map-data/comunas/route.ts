import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleOptions } from '@/shared/lib/cors';
import { queryComunas } from '@/shared/lib/queries/referenciales';
import { applyRateLimit } from '@/shared/lib/ratelimit';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    const rl = await applyRateLimit(request);
    if (rl?.response?.status === 429) return rl.response;
    const rlHeaders = rl?.headers ?? {};

    const comunas = await queryComunas();

    const total = comunas.reduce((sum, c) => sum + c.count, 0);

    return NextResponse.json(
      {
        success: true,
        data: comunas,
        metadata: {
          total,
          distinct: comunas.length,
          timestamp: new Date().toISOString(),
          apiVersion: 'v1',
        },
      },
      {
        headers: {
          ...corsHeaders(),
          ...rlHeaders,
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('[API v1] map-data/comunas error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
