import { NextRequest, NextResponse } from 'next/server';
import { getUser, getProfile } from '@/shared/lib/supabase/auth';
import { prisma } from '@/shared/lib/prisma';
import { ReviewInputSchema } from '@/shared/lib/schemas/contribution';
import { awardPoints } from '@/features/gamification/lib/points';
import { evaluateBadges } from '@/features/gamification/lib/badges';
import { PointReason } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const profile = await getProfile(user.id);
    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = ReviewInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const contribution = await prisma.contribution.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true, contributionType: true },
    });

    if (!contribution) {
      return NextResponse.json({ error: 'Contribución no encontrada' }, { status: 404 });
    }

    if (contribution.status !== 'pending') {
      return NextResponse.json(
        { error: `Contribución ya fue revisada (status: ${contribution.status})` },
        { status: 409 }
      );
    }

    const updated = await prisma.contribution.update({
      where: { id },
      data: {
        status: parsed.data.status,
        reviewerId: user.id,
        reviewNote: parsed.data.reviewNote,
        reviewedAt: new Date(),
      },
      select: { id: true, status: true, reviewedAt: true },
    });

    // Gamification: award points based on review result
    if (contribution.userId) {
      const contributorId = contribution.userId;
      if (parsed.data.status === 'approved') {
        const pts = contribution.contributionType === 'correction' ? 10 : 20;
        const reason = contribution.contributionType === 'correction'
          ? PointReason.CORRECTION_APPROVED
          : PointReason.CONTRIBUTION_APPROVED;
        awardPoints(contributorId, pts, reason, id)
          .then(() => evaluateBadges(contributorId))
          .catch((err) => console.error('[Gamification] review points error:', err));
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('[API] referenciales/contributions/[id]/review error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
