import { prisma } from '@/shared/lib/prisma';
import { PointReason } from '@prisma/client';

export async function awardPoints(
  userId: string,
  points: number,
  reason: PointReason,
  referenceId?: string
) {
  return prisma.inmogridPointsLedger.create({
    data: { userId, points, reason, referenceId },
  });
}

export async function getUserTotalPoints(userId: string): Promise<number> {
  const result = await prisma.inmogridPointsLedger.aggregate({
    where: { userId },
    _sum: { points: true },
  });
  return result._sum.points ?? 0;
}

export async function getPointsHistory(userId: string, limit = 20) {
  return prisma.inmogridPointsLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
