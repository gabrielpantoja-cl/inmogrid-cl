'use client';

import { BadgeDisplay } from './BadgeDisplay';
import type { BadgeTier } from '@prisma/client';

interface UserBadge {
  id: string;
  earnedAt: Date | string;
  badge: {
    name: string;
    description: string;
    tier: BadgeTier;
  };
}

interface BadgeGridProps {
  badges: UserBadge[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Sin insignias todav&iacute;a. Publica contenido o contribuye datos para ganar tu primera.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((ub) => (
        <BadgeDisplay
          key={ub.id}
          name={ub.badge.name}
          description={ub.badge.description}
          tier={ub.badge.tier}
          earnedAt={ub.earnedAt}
        />
      ))}
    </div>
  );
}
