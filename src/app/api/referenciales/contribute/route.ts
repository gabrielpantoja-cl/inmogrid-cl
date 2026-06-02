import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/shared/lib/supabase/auth';
import { prisma } from '@/shared/lib/prisma';
import { ContributionInputSchema } from '@/shared/lib/schemas/contribution';
import { sanitizeInput } from '@/shared/lib/sanitize';
import { awardPoints } from '@/features/gamification/lib/points';
import { PointReason } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ContributionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Sanitize string fields
    const sanitized = {
      ...data,
      fojas: data.fojas ? sanitizeInput(data.fojas) : undefined,
      cbr: data.cbr ? sanitizeInput(data.cbr) : undefined,
      predio: data.predio ? sanitizeInput(data.predio) : undefined,
      comuna: data.comuna ? sanitizeInput(data.comuna) : undefined,
      observaciones: data.observaciones ? sanitizeInput(data.observaciones) : undefined,
      fechaescritura: data.fechaescritura ? new Date(data.fechaescritura) : undefined,
      monto: data.monto ? BigInt(data.monto) : undefined,
    };

    const contribution = await prisma.contribution.create({
      data: {
        userId: user.id,
        sourceId: sanitized.sourceId,
        contributionType: sanitized.contributionType,
        lat: sanitized.lat,
        lng: sanitized.lng,
        fojas: sanitized.fojas,
        numero: sanitized.numero,
        anio: sanitized.anio,
        cbr: sanitized.cbr,
        predio: sanitized.predio,
        comuna: sanitized.comuna,
        rol: data.rol,
        fechaescritura: sanitized.fechaescritura,
        superficieTerreno: data.superficieTerreno,
        superficieConstruida: data.superficieConstruida,
        destino: data.destino,
        montoUf: data.montoUf,
        monto: sanitized.monto,
        observaciones: sanitized.observaciones,
      },
      select: { id: true, status: true, createdAt: true },
    });

    // Gamification: award points for bug reports/corrections on submission
    if (data.contributionType === 'report' || data.contributionType === 'correction') {
      awardPoints(user.id, 5, PointReason.BUG_REPORT, contribution.id)
        .catch((err) => console.error('[Gamification] contribute points error:', err));
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: contribution.id,
          status: contribution.status,
          createdAt: contribution.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] referenciales/contribute error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
