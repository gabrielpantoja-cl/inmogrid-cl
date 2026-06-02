import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/shared/lib/supabase/auth';
import { prisma } from '@/shared/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 100);
    const offset = Number(searchParams.get('offset') || '0');

    const [contributions, total] = await Promise.all([
      prisma.contribution.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          sourceId: true,
          contributionType: true,
          lat: true,
          lng: true,
          comuna: true,
          predio: true,
          rol: true,
          anio: true,
          monto: true,
          status: true,
          reviewNote: true,
          reviewedAt: true,
          createdAt: true,
        },
      }),
      prisma.contribution.count({ where: { userId: user.id } }),
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
    console.error('[API] referenciales/my-contributions error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
