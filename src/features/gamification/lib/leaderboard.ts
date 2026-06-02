import { prisma } from '@/shared/lib/prisma';

interface LeaderboardEntry {
  userId: string;
  totalPoints: number;
  rank: number;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const grouped = await prisma.inmogridPointsLedger.groupBy({
    by: ['userId'],
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const userIds = grouped.map((g) => g.userId);
  const profiles = await prisma.profile.findMany({
    where: { id: { in: userIds } },
    select: { id: true, fullName: true, username: true, avatarUrl: true },
  });
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return grouped.map((g, i) => {
    const profile = profileMap.get(g.userId);
    return {
      userId: g.userId,
      totalPoints: g._sum.points ?? 0,
      rank: i + 1,
      fullName: profile?.fullName ?? null,
      username: profile?.username ?? g.userId.slice(0, 8),
      avatarUrl: profile?.avatarUrl ?? null,
    };
  });
}

export async function getUserRank(userId: string): Promise<number | null> {
  const grouped = await prisma.inmogridPointsLedger.groupBy({
    by: ['userId'],
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
  });

  const index = grouped.findIndex((g) => g.userId === userId);
  return index >= 0 ? index + 1 : null;
}
