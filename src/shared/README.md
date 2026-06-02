# `src/shared/`

Código **cross-cutting**: utilidades, componentes y tipos usados por ≥2 features.

## Qué vive aquí

```
shared/
├── components/
│   ├── ui/        # shadcn primitives (button, dialog, form, card)
│   └── layout/    # Navbar, Sidenav, Footer
├── hooks/         # useAuth, usePermissions, etc.
├── lib/           # supabase/, prisma.ts, utils, zod base
├── types/         # re-exports de Prisma + shapes API estándar
└── constants/     # professions, regions, comunas
```

## Reglas

1. `shared/` **NO** importa de `features/` ni de `app/`. Solo de otras partes de `shared/` y de librerías externas.
2. Si algo vive en `shared/` pero solo lo usa un feature → muévelo al feature.
3. Si algo vive en un feature pero lo necesitan ≥2 features → súbelo a `shared/`.
4. Los `index.ts` barrel son bienvenidos para exponer API pública clara.

## Estado actual (Sprint 1)

Esta carpeta está **en construcción**. Durante Sprint 1 solo contiene:
- Este README
- Subcarpetas vacías como placeholder

Los moves reales ocurren en Sprint 2-3. Mientras tanto, el código vive en `src/components/`, `src/hooks/`, `src/lib/`. Ver `docs/arquitectura/ROADMAP-refactor.md`.

## Migración planeada (Sprint 3)

| Origen | Destino |
|---|---|
| `src/components/ui/` (primitives) | `src/shared/components/ui/` |
| `src/components/ui/common/Navbar*`, `Footer`, `Sidenav` | `src/shared/components/layout/` |
| `src/hooks/useAuth.ts` | `src/shared/hooks/` |
| `src/lib/supabase/` | `src/shared/lib/supabase/` |
| `src/lib/prisma.ts`, `utils.ts`, `zod.ts` | `src/shared/lib/` |
| `src/lib/comunas.ts` (399L datos) | `src/shared/constants/comunas.ts` |
| `src/types/*` | `src/shared/types/` |
