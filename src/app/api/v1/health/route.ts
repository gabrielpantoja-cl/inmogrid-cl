import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleOptions } from '@/shared/lib/cors';
import { testNeonConnection } from '@/shared/lib/neon';
import { prisma } from '@/shared/lib/prisma';
import { queryReferencialStats } from '@/shared/lib/queries/referenciales';
import { applyRateLimit } from '@/shared/lib/ratelimit';

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  const rl = await applyRateLimit(request);
  if (rl?.response?.status === 429) return rl.response;
  const rlHeaders = rl?.headers ?? {};

  const startTime = Date.now();
  const includeStats = request.nextUrl.searchParams.get('stats') === 'true';

  // Test both backends in parallel
  const [supabaseResult, neonResult] = await Promise.all([
    testSupabase(),
    testNeonConnection(),
  ]);

  const allUp = supabaseResult.status === 'up' && neonResult.status === 'up';
  const anyDown = supabaseResult.status === 'down' || neonResult.status === 'down';
  const totalResponseTime = Date.now() - startTime;
  const isDegraded = allUp && totalResponseTime > 5000;

  const status = anyDown ? 'unhealthy' : isDegraded ? 'degraded' : 'healthy';
  const httpStatus = anyDown ? 503 : 200;

  let stats = undefined;
  if (includeStats && neonResult.status === 'up') {
    try {
      stats = await queryReferencialStats();
    } catch {
      stats = { totalReferenciales: 0, lastUpdate: new Date().toISOString() };
    }
  }

  return NextResponse.json(
    {
      success: !anyDown,
      health: {
        status,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        services: {
          database: {
            supabase: supabaseResult,
            neon: neonResult,
          },
          api: {
            status: 'up',
            endpoints: {
              mapData: true,
              mapConfig: true,
              docs: true,
            },
          },
        },
        ...(stats && { stats }),
      },
      apiVersion: 'v1',
      responseTime: `${totalResponseTime}ms`,
    },
    { status: httpStatus, headers: { ...corsHeaders(), ...rlHeaders } }
  );
}

async function testSupabase(): Promise<{
  status: 'up' | 'down';
  responseTime: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    return { status: 'up', responseTime: Date.now() - start };
  } catch (err) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
