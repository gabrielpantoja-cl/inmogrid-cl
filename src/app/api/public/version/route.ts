// Endpoint de versión para detección de deploys nuevos en el cliente.
// Consumido por `VersionChecker` (poll cada 5 min + on focus) para mostrar
// el toast "nueva versión disponible". Vercel inyecta `VERCEL_GIT_COMMIT_SHA`
// automáticamente en todos los deploys; en dev devuelve 'dev' y nunca cambia.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev';
  return NextResponse.json(
    { sha },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    }
  );
}
