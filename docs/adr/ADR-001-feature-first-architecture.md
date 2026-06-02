# ADR-001: Feature-First Architecture

**Estado**: Aceptado
**Fecha**: 2026-04-08
**Decisores**: equipo de inmogrid.cl
**Contexto de ejecución**: Roadmap de refactor `docs/arquitectura/ROADMAP-refactor.md`

---

## Contexto

inmogrid.cl es un ecosistema digital colaborativo para el sector inmobiliario chileno (perfiles + posts + networking + referenciales + chat Sofia + eventos + plantas + tasaciones futuras). En Fase 1 el proyecto creció a:

- 128 componentes en `src/components/` (mezcla `ui/`, `features/`, `forms/`, `networking/`, `referenciales/`)
- 22 API routes en `src/app/api/`
- Hooks partidos entre `src/hooks/` y `src/lib/hooks/`
- Tipos dispersos (solo 30 líneas en `src/types/`)
- Componentes >200L: `ProfileEditForm.tsx` (471L), `navbar` (320L), `CookieConsentBanner` (287L), 3 más
- Sin ADRs, sin guía de patrones, sin enforcement automático de boundaries

El proyecto sigue una **arquitectura híbrida layer + feature-lite** sin convenciones claras. Agregar un feature nuevo implica decisiones ad-hoc sobre dónde vive cada cosa.

## Decisión

Adoptamos una **Feature-First Architecture** con dos zonas:

1. **`src/features/`** — dominios de negocio. Cada feature es autocontenida:
   ```
   features/<feature-name>/
   ├── api/          # route handlers + lib específica de rutas
   ├── components/   # componentes del feature (<200L cada uno)
   ├── hooks/        # hooks del feature
   ├── lib/          # queries Prisma, validations Zod, utils
   ├── types/        # tipos del feature
   ├── actions/      # server actions (opcional)
   └── README.md     # scope + API pública + dependencies permitidas
   ```

2. **`src/shared/`** — código cross-cutting REAL (usado por ≥2 features):
   ```
   shared/
   ├── components/ui/       # shadcn primitives
   ├── components/layout/   # Navbar, Sidenav, Footer
   ├── hooks/               # useAuth, usePermissions
   ├── lib/                 # supabase/, prisma, utils, zod base
   ├── types/               # re-exports de Prisma + shapes API estándar
   └── constants/           # professions, regions, comunas
   ```

3. **`src/app/`** — **solo routing y layouts de Next.js**. Las `page.tsx` y `route.ts` son delgadas y delegan a `features/`.

## Reglas de dependencias

| Desde → Hacia | `features/X` | `features/Y` (otro) | `shared/` | `app/` | Externos (npm) |
|---|---|---|---|---|---|
| `features/X` | ✅ dentro de X | ❌ **PROHIBIDO** | ✅ | ❌ | ✅ |
| `shared/` | ❌ | ❌ | ✅ dentro de shared | ❌ | ✅ |
| `app/` | ✅ | ✅ | ✅ | ✅ | ✅ |

**Regla dura**: un feature **nunca** importa de otro feature. Si dos features necesitan compartir algo, ese algo sube a `shared/`.

**Enforcement**: `eslint-plugin-boundaries` en modo warning durante Sprint 1-2, error en Sprint 3.

## Consecuencias

### Positivas

- **Ownership claro**: cada feature tiene una carpeta, un README y un dueño.
- **Onboarding rápido**: un dev nuevo entiende un feature leyendo una sola carpeta.
- **Refactors aislados**: cambios en `features/posts` no tocan `features/networking`.
- **CI más rápido**: tests por feature en paralelo, sin efectos cruzados.
- **Escalabilidad**: agregar tasaciones, admin panel, API pública v2 no requiere repensar la estructura.
- **Deuda técnica visible**: componentes >200L y acoplamientos cross-feature saltan en code review.

### Negativas

- **Costo de migración**: ~2-3 sprints de refactor incremental (ver roadmap).
- **Curva de aprendizaje inicial**: devs acostumbrados a layer folders deben adaptarse.
- **Posible duplicación temporal**: durante la migración conviven `components/networking/` (viejo) y `features/networking/components/` (nuevo) hasta que se complete el move.
- **Enforcement requiere tooling**: sin `eslint-plugin-boundaries` las reglas se olvidan.

## Alternativas consideradas

### 1. Mantener arquitectura layer actual

- **Rechazada**: ya probó ser insostenible a 128 componentes. No escala a 10+ features.

### 2. Feature-Sliced Design (FSD) literal

- **Rechazada**: la jerarquía de FSD (`shared → entities → features → widgets → pages`) es demasiado granular para el tamaño actual del proyecto. Adoptamos la idea central (dominios autocontenidos) sin la ceremonia.

### 3. Monorepo con paquetes por feature

- **Rechazada** por ahora: overhead de turborepo/nx no justifica para un solo deploy en Vercel. Reevaluar si crecemos a varios apps (ej. admin panel separado).

### 4. Colocar todo en `src/app/` usando convenciones de Next.js App Router

- **Rechazada**: mezcla lógica de negocio con routing. Dificulta testing y reutilización entre rutas.

## Relacionados

- Roadmap de ejecución: `docs/arquitectura/ROADMAP-refactor.md`
- Estándares de código: `CLAUDE.md` (límite 200L, TS strict, etc.)
- Futuro ADR-002: convenciones de testing por feature
- Futuro ADR-003: estrategia de API pública v2
