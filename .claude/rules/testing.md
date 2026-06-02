---
description: Testing conventions and requirements
globs: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "tests/**/*"]
---

# Testing

- Jest for unit/integration tests, Playwright for E2E
- Test files: `*.test.ts` co-located with source, or in `tests/` for integration
- API tests: `tests/api/` — test both success and error paths
- Public API tests: `npm run test:public-api` — must pass before deploy
- Always test Prisma error codes: P2002 (unique constraint), P2025 (not found)
- Mock external services (Supabase Auth, OpenAI) but NOT the database for integration tests
- E2E tests use Playwright — `npm run test:e2e`
- Build verification: `npm run build` must succeed before any feature is considered complete
