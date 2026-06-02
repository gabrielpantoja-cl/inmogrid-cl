import { prisma } from '@/shared/lib/prisma';
import { BadgeCategory, PointReason } from '@prisma/client';
import { awardPoints } from './points';

const TIER_BONUS: Record<string, number> = {
  BRONZE: 5,
  SILVER: 15,
  GOLD: 30,
  PLATINUM: 50,
};

export async function getUserBadges(userId: string) {
  return prisma.inmogridUserBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  });
}

export async function checkAndAwardBadge(userId: string, badgeSlug: string) {
  const badge = await prisma.inmogridBadge.findUnique({
    where: { slug: badgeSlug },
  });
  if (!badge) return null;

  const existing = await prisma.inmogridUserBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (existing) return null;

  const userBadge = await prisma.inmogridUserBadge.create({
    data: { userId, badgeId: badge.id },
    include: { badge: true },
  });

  const bonus = badge.pointsAwarded || TIER_BONUS[badge.tier] || 0;
  if (bonus > 0) {
    await awardPoints(userId, bonus, PointReason.BADGE_EARNED, badge.id);
  }

  return userBadge;
}

async function countForCategory(userId: string, category: BadgeCategory) {
  switch (category) {
    case 'CONTENT':
      return prisma.post.count({
        where: { userId, published: true },
      });
    case 'DATA':
      return prisma.contribution.count({
        where: { userId, status: 'approved', contributionType: 'new' },
      });
    case 'COMMUNITY':
      return prisma.contribution.count({
        where: {
          userId,
          contributionType: { in: ['correction', 'report'] },
        },
      });
    default:
      return 0;
  }
}

export async function evaluateBadges(userId: string) {
  const allBadges = await prisma.inmogridBadge.findMany();
  const earnedIds = new Set(
    (await prisma.inmogridUserBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    })).map((ub) => ub.badgeId)
  );

  const awarded: string[] = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;
    if (badge.category === 'SPECIAL') continue;

    const count = await countForCategory(userId, badge.category);
    if (count >= badge.threshold) {
      await checkAndAwardBadge(userId, badge.slug);
      awarded.push(badge.slug);
    }
  }

  return awarded;
}
