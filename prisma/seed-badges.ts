import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const badges = [
  {
    slug: 'first-post',
    name: 'Primera Publicación',
    description: 'Publica tu primer artículo en el blog',
    category: 'CONTENT' as const,
    tier: 'BRONZE' as const,
    threshold: 1,
    pointsAwarded: 5,
  },
  {
    slug: 'prolific-writer',
    name: 'Escritor Prolífico',
    description: 'Publica 5 artículos en el blog',
    category: 'CONTENT' as const,
    tier: 'SILVER' as const,
    threshold: 5,
    pointsAwarded: 15,
  },
  {
    slug: 'thought-leader',
    name: 'Líder de Pensamiento',
    description: 'Publica 20 artículos en el blog',
    category: 'CONTENT' as const,
    tier: 'GOLD' as const,
    threshold: 20,
    pointsAwarded: 30,
  },
  {
    slug: 'first-contribution',
    name: 'Primer Aporte',
    description: 'Tu primer referencial aprobado',
    category: 'DATA' as const,
    tier: 'BRONZE' as const,
    threshold: 1,
    pointsAwarded: 5,
  },
  {
    slug: 'data-contributor-10',
    name: 'Colaborador de Datos',
    description: '10 referenciales aprobados',
    category: 'DATA' as const,
    tier: 'SILVER' as const,
    threshold: 10,
    pointsAwarded: 15,
  },
  {
    slug: 'data-master',
    name: 'Maestro de Datos',
    description: '50 referenciales aprobados',
    category: 'DATA' as const,
    tier: 'GOLD' as const,
    threshold: 50,
    pointsAwarded: 30,
  },
  {
    slug: 'bug-hunter',
    name: 'Cazador de Errores',
    description: 'Reporta tu primer error en los datos',
    category: 'COMMUNITY' as const,
    tier: 'BRONZE' as const,
    threshold: 1,
    pointsAwarded: 5,
  },
  {
    slug: 'vigilant-eye',
    name: 'Ojo Vigilante',
    description: '10 reportes o correcciones aceptadas',
    category: 'COMMUNITY' as const,
    tier: 'SILVER' as const,
    threshold: 10,
    pointsAwarded: 15,
  },
  {
    slug: 'early-adopter',
    name: 'Pionero',
    description: 'Miembro registrado antes de 2026',
    category: 'SPECIAL' as const,
    tier: 'SILVER' as const,
    threshold: 0,
    pointsAwarded: 15,
  },
];

async function seedBadges() {
  console.log('Seeding badges...');

  for (const badge of badges) {
    await prisma.inmogridBadge.upsert({
      where: { slug: badge.slug },
      update: { ...badge },
      create: { ...badge },
    });
    console.log(`  ✓ ${badge.slug} (${badge.tier})`);
  }

  console.log(`\nDone! Seeded ${badges.length} badges.`);
}

seedBadges()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
