// __tests__/__helpers__/database-helper.ts
import { PrismaClient } from '@prisma/client';

// Cliente Prisma específico para tests
let prismaForTests: PrismaClient;

export const setupTestDatabase = () => {
  if (!prismaForTests) {
    prismaForTests = new PrismaClient({
      datasources: {
        db: {
          url: process.env.POSTGRES_PRISMA_URL
        }
      }
    });
  }
  return prismaForTests;
};

export const cleanupTestDatabase = async () => {
  if (prismaForTests) {
    // Limpiar datos de prueba creados durante los tests
    // Limpiar conservadores de prueba
    await prismaForTests.$disconnect();
  }
};

export { prismaForTests };
