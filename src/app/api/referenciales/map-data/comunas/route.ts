import { NextResponse } from 'next/server';
import { getUser } from '@/shared/lib/supabase/auth';
import { queryComunas } from '@/shared/lib/queries/referenciales';

/**
 * GET /api/referenciales/map-data/comunas
 *
 * Endpoint AUTENTICADO — contraparte privada de
 * `/api/v1/map-data/comunas`. Requiere sesión; sin rate-limit, sin CORS,
 * cache `no-store`.
 */
export async function GET() {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json(
      { success: false, error: 'No autenticado' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
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
          authenticated: true,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[API auth] /api/referenciales/map-data/comunas error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
