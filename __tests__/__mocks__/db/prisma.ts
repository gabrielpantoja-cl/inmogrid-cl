// __tests__/__mocks__/db/prisma.ts
import { PrismaClient } from '@prisma/client';

export interface Context {
  prisma: PrismaClient;
}

export const prismaMock = {
  profile: {
    findUnique: jest.fn().mockImplementation(() => Promise.resolve()),
    create: jest.fn().mockImplementation(() => Promise.resolve()),
    update: jest.fn().mockImplementation(() => Promise.resolve()),
    delete: jest.fn().mockImplementation(() => Promise.resolve()),
    upsert: jest.fn().mockImplementation(() => Promise.resolve()),
    deleteMany: jest.fn().mockImplementation(() => Promise.resolve({ count: 0 })),
  },
  connection: {
    deleteMany: jest.fn().mockImplementation(() => Promise.resolve({ count: 0 })),
  },
  post: {
    findMany: jest.fn().mockImplementation(() => Promise.resolve([])),
    count: jest.fn().mockImplementation(() => Promise.resolve(0)),
  },
  $queryRaw: jest.fn().mockImplementation(() => Promise.resolve([])),
  $disconnect: jest.fn().mockImplementation(() => Promise.resolve()),
} as unknown as PrismaClient;

export const mockProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  fullName: 'Test User',
  avatarUrl: 'https://example.com/image.jpg',
  username: 'testuser',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultMocks();
});

const setupDefaultMocks = () => {
  (prismaMock.profile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
  (prismaMock.profile.create as jest.Mock).mockResolvedValue(mockProfile);
  (prismaMock.profile.update as jest.Mock).mockResolvedValue(mockProfile);
  (prismaMock.profile.delete as jest.Mock).mockResolvedValue(mockProfile);
};

export const createMockContext = (): Context => ({
  prisma: prismaMock,
});

export const setMockPrismaData = (data: Record<string, any>) => {
  Object.entries(data).forEach(([model, operations]) => {
    if (prismaMock[model as keyof typeof prismaMock]) {
      Object.entries(operations as Record<string, any>).forEach(([operation, value]) => {
        const mockFn = (prismaMock as any)[model][operation];
        if (typeof mockFn === 'function') {
          (mockFn as jest.Mock).mockResolvedValue(value);
        }
      });
    }
  });
};

export { prismaMock as prisma };
export default prismaMock;
