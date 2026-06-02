---
description: TypeScript and React code style conventions for inmogrid.cl
globs: ["src/**/*.ts", "src/**/*.tsx"]
---

# Code Style

- TypeScript strict mode — avoid `any`, prefer explicit types
- Import alias: `@/` maps to `src/`
- Feature-based structure: `src/features/{feature}/` (components, hooks, lib, types)
- Shared primitives: `src/shared/components/`, `src/shared/hooks/`, `src/shared/lib/`
- Components: functional only, named exports, under 200 lines (split into sections if larger)
- Hooks: prefix with `use`, place in `src/shared/hooks/` (cross-feature) or feature-local `hooks/`
- Prisma models: use camelCase field names (Prisma handles `@map` to snake_case)
- Tailwind CSS for all styling — no CSS modules, no styled-components
- shadcn/ui primitives in `src/shared/components/ui/primitives/` — compose, don't reach for new shadcn pieces blindly
- Zod for all runtime validation (forms, API input)
- No default exports except Next.js pages/layouts and the rare orchestrator component
