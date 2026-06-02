# Roadmap de Refactor — Feature-First Architecture

**Fecha**: 2026-04-08
**Estado**: En ejecución (Sprint 1)
**Objetivo**: Migrar inmogrid.cl de una estructura layer/híbrida a una arquitectura por features que escale a 10+ módulos sin deuda técnica.

---

## Motivación

El proyecto creció a 128 componentes + 22 API routes mezclando patrones layer (`components/`, `lib/`) con feature-lite (`networking/`, `referenciales/`). Síntomas:

- Componentes monstruo: `ProfileEditForm.tsx` (471L), `navbar` (320L), `CookieConsentBanner` (287L) — violan el límite de 200L del CLAUDE.md.
- Hooks partidos entre `src/hooks/` y `src/lib/hooks/`.
- API routes con lógica inline (`generateSlug` en `api/posts/route.ts`).
- Tipos dispersos (30 líneas totales en `src/types/`); enums solo en `prisma/schema.prisma`.
- Acoplamientos cross-feature sin boundaries (`components/networking` importa de `app/actions/networking.ts`).
- Sin ADRs ni guía de patrones.

**Diagnóstico**: la estructura actual aguanta 1-2 sprints más. Colapsa al agregar tasaciones, API pública, admin panel.

---

## Arquitectura objetivo

```
src/
├── features/                     ← dominios de negocio
│   ├── posts/
│   │   ├── api/                  (route handlers delgados)
│   │   ├── components/           (<200L cada uno)
│   │   ├── hooks/
│   │   ├── lib/                  (queries, validations, utils)
│   │   ├── types/
│   │   └── README.md             (scope + dependencies permitidas)
│   ├── profiles/
│   ├── networking/
│   ├── referenciales/
│   ├── chat/                     (Sofia)
│   ├── events/
│   ├── plants/
│   └── tasaciones/               (futuro)
│
├── shared/                       ← cross-cutting REAL
│   ├── components/
│   │   ├── ui/                   (shadcn primitives)
│   │   └── layout/               (Navbar, Sidenav, Footer)
│   ├── hooks/                    (useAuth, usePermissions)
│   ├── lib/                      (supabase/, prisma.ts, utils, zod base)
│   ├── types/                    (re-exports de Prisma)
│   └── constants/                (professions, regions, comunas)
│
├── app/                          ← SOLO routing + layouts
│   ├── layout.tsx
│   ├── dashboard/[feature]/page.tsx
│   ├── [username]/page.tsx
│   └── api/[feature]/route.ts    (delega a features/[feature]/api)
│
└── middleware.ts
```

**Regla dura**: un feature puede importar de `shared/` y de librerías externas. **NUNCA de otro feature**. Enforzable con `eslint-plugin-boundaries`.

---

## Sprint 1 — Fundamentos (1 semana) · **EN CURSO**

Objetivo: crear la infraestructura sin romper nada. Cero moves masivos.

- [x] **S1.1** — Crear `docs/arquitectura/ROADMAP-refactor.md` (este archivo)
- [x] **S1.2** — Crear ADR-001 "Feature-First Architecture" en `docs/adr/`
- [x] **S1.3** — Crear `src/features/` y `src/shared/` vacíos con READMEs explicativos
- [x] **S1.4** — Agregar `@/features/*` y `@/shared/*` a `tsconfig.json` paths
- [x] **S1.5** — Consolidar hooks duplicados: mover `src/lib/hooks/*` → `src/hooks/` y actualizar 3 imports
- [x] **S1.6** — Centralizar tipos: crear `src/types/index.ts` con re-exports de enums de Prisma
- [x] **S1.7** — Agregar `eslint-plugin-boundaries` en modo warning (no bloqueante)

**No se hace en Sprint 1** (demasiado disruptivo, se deja para Sprint 2):
- Mover `components/ui/` a `shared/components/ui/` (38 archivos con imports a actualizar)
- Mover `lib/supabase/` a `shared/lib/supabase/`
- Descomponer `ProfileEditForm.tsx`

---

## Sprint 2 — Migración feature por feature (2 semanas)

Objetivo: migrar features de menor acoplamiento a mayor, sin big-bang.

### Orden recomendado

1. **`referenciales`** (más aislado — ya vive solo en `components/referenciales/` + `lib/referenciales-api.ts`)
   - Mover a `features/referenciales/{components,lib,page}/`
   - El page.tsx actual se queda como `app/referenciales/page.tsx` pero importa desde `@/features/referenciales`

2. **`posts`** (relativamente aislado — la tabla tiene columnas legacy fuera del Prisma schema)
   - Extraer `generateSlug` y helpers inline de `api/posts/route.ts` → `features/posts/lib/`
   - Crear `features/posts/lib/queries.ts` con funciones Prisma reutilizables
   - Crear `features/posts/lib/validations.ts` (Zod)
   - Mover componentes de posts desde `components/` → `features/posts/components/`

3. **`networking`** (romper acoplamiento con `app/actions/`)
   - Mover `components/networking/` → `features/networking/components/`
   - Mover `app/actions/networking.ts` → `features/networking/actions/`
   - Mover API routes a `features/networking/api/`

4. **`profiles`** (el más grande — descomposición necesaria)
   - Descomponer `ProfileEditForm.tsx` (471L) en:
     - `features/profiles/components/ProfileEditForm.tsx` (orquestador <150L)
     - `features/profiles/components/ProfileFormFields.tsx`
     - `features/profiles/hooks/useProfileForm.ts`
     - `features/profiles/lib/validations.ts`
   - Mover `api/users/profile/route.ts` → `features/profiles/api/`

5. ~~`chat`~~ **ELIMINADO** (2026-04-24) — `features/chat` era OpenAI legacy sin RAG. Se eliminó completo junto con las deps `@ai-sdk/openai` y `ai`, la ruta `/api/chat`, `/chatbot`, y el modelo `ChatMessage`. Reemplazo: `features/sofia-chat` (pausado, ver ADR-006). No queda deuda migratoria acá.

6. **`events`, `plants`** — migrar cuando se retomen (Fase 2+)

### Regla de migración

Cada feature migrado debe:
- Tener un `README.md` con scope, dependencies permitidas y API pública del módulo
- Pasar `eslint-plugin-boundaries` (sin warnings)
- Tener al menos 1 test unitario en `lib/` y 1 test de integración en `api/`

---

## Sprint 3 — Limpieza y enforcement (1 semana)

- Mover `components/ui/` → `shared/components/ui/` (con codemod)
- Mover `lib/supabase/` → `shared/lib/supabase/` (con codemod)
- Mover `lib/prisma.ts`, `lib/utils.ts`, `lib/zod.ts` → `shared/lib/`
- Mover `lib/comunas.ts` → `shared/constants/comunas.ts`
- Endurecer `eslint-plugin-boundaries` de warning → **error**
- Agregar `dependency-cruiser` en CI para detectar ciclos
- Escribir `docs/arquitectura/patrones.md` (convenciones de código, cuándo crear un feature, cuándo queda en shared)
- Borrar barrels vacíos y archivos huérfanos

---

## Métricas de éxito

| Métrica | Antes (2026-04-08) | Objetivo (post-Sprint 3) |
|---|---|---|
| Componentes >200L | 6 | 0 |
| Hooks en `src/lib/hooks/` | 2 | 0 (consolidados) |
| Features con README | 0 | 100% |
| ADRs en repo | 0 | ≥3 |
| Warnings `eslint-plugin-boundaries` | N/A | 0 |
| Tiempo onboarding dev nuevo | ~2 días | <4 horas |

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Romper imports durante moves | Codemods con `jscodeshift` + tests CI en cada PR |
| Conflictos con PRs en vuelo | Migración incremental por feature, no big-bang |
| Breaking changes en tabla `posts` | Migrar columnas legacy con cuidado; verificar queries raw |
| Tiempo de CI crece con boundaries lint | Warning-only en Sprint 1-2, error en Sprint 3 |

---

## Referencias

- ADR-001: Feature-First Architecture → `docs/adr/ADR-001-feature-first-architecture.md`
- CLAUDE.md raíz: estándares de código (límite 200L, TS strict, etc.)
- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries)
- [Feature-Sliced Design](https://feature-sliced.design/) (inspiración, no adopción literal)
