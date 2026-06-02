import { type BadgeTier } from '@prisma/client';

interface BadgeDisplayProps {
  name: string;
  description: string;
  tier: BadgeTier;
  earnedAt?: Date | string;
}

const tierStyles: Record<BadgeTier, string> = {
  BRONZE: 'bg-amber-100 text-amber-800 border-amber-300',
  SILVER: 'bg-gray-100 text-gray-800 border-gray-300',
  GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PLATINUM: 'bg-purple-100 text-purple-800 border-purple-300',
};

const tierEmoji: Record<BadgeTier, string> = {
  BRONZE: '\u{1F949}',
  SILVER: '\u{1F948}',
  GOLD: '\u{1F947}',
  PLATINUM: '\u{1F48E}',
};

export function BadgeDisplay({ name, description, tier, earnedAt }: BadgeDisplayProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${tierStyles[tier]}`}
      title={`${description}${earnedAt ? ` — obtenido ${new Date(earnedAt).toLocaleDateString('es-CL')}` : ''}`}
    >
      <span aria-hidden="true">{tierEmoji[tier]}</span>
      <span>{name}</span>
    </div>
  );
}
