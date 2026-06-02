const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
    '^next/image$': '<rootDir>/__mocks__/next/image.tsx',
  },
  testMatch: [
    "**/__tests__/**/*.(spec|test).[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)"
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/__tests__/__helpers__/',
    '<rootDir>/__tests__/__mocks__/',
    '<rootDir>/__tests__/config/',
    '<rootDir>/__tests__/e2e/',  // Playwright tests (run with 'npm run test:e2e')
  ],
  coverageDirectory: '<rootDir>/coverage/',
  collectCoverage: false, // Cambiar a true cuando los tests funcionen
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**', 
    '!**/__tests__/**', 
    '!**/coverage/**', 
  ],
  verbose: true,
  testTimeout: 30000,
  // Next.js con next/jest maneja automáticamente TypeScript y JSX
  transformIgnorePatterns: [
    '/node_modules/(?!next-auth|jose|@next-auth/prisma-adapter|@react-leaflet|react-leaflet|leaflet|leaflet-draw|@react-leaflet/core)/'
  ],
};

module.exports = createJestConfig(customJestConfig);