/**
 * API Route para logging de autenticación
 * /api/auth-logs - Endpoint para capturar logs de auth en producción
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/shared/lib/supabase/auth';

/**
 * Extrae la IP del cliente desde los headers HTTP
 * Considera proxies, CDNs y load balancers
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIP) return realIP;
  if (clientIP) return clientIP;
  if (cfConnectingIP) return cfConnectingIP;

  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    const logData = await request.json();

    // Validar estructura del log
    if (!logData.level || !logData.action || !logData.timestamp) {
      return NextResponse.json(
        { error: 'Invalid log structure' },
        { status: 400 }
      );
    }

    // En desarrollo, solo loggear en consola
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUTH-LOG]', {
        ...logData,
        sessionExists: !!user,
        userId: user?.id ?? 'anonymous'
      });

      return NextResponse.json({ success: true, environment: 'development' });
    }

    // En producción, loggear en consola del servidor
    console.log('[PROD-AUTH-LOG]', {
      ...logData,
      sessionExists: !!user,
      userId: user?.id ?? 'anonymous',
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      environment: 'production',
      logged: true
    });

  } catch (error) {
    console.error('Error in auth-logs API:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Solo permitir POST
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
