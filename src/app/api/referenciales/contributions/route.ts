import { NextRequest, NextResponse } from 'next/server';
import { getUser, getProfile } from '@/shared/lib/supabase/auth';
import { prisma } from '@/shared/lib/prisma';
import type { ContributionStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const profile = await getProfile(user.id);
    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 200);
    const offset = Number(searchParams.get('offset') || '0');

    const validStatuses: ContributionStatus[] = ['pending', 'approved', 'rejected'];
    const where = status && validStatuses.includes(status as ContributionStatus)
      ? { status: status as ContributionStatus }
      : {};

    const [contributions, total] = await Promise.all([
      prisma.contribution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.contribution.count({ where }),
    ]);

    // Serialize BigInt monto to string
    const serialized = contributions.map((c) => ({
      ...c,
      monto: c.monto?.toString() ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: serialized,
      metadata: { total, limit, offset },
    });
  } catch (error) {
    console.error('[API] referenciales/contributions error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
