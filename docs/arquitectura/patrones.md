# Patrones de Código — inmogrid.cl

**Estado**: Vivo — actualizar cuando un patrón cambie o se agregue uno nuevo.
**Última actualización**: 2026-04-21 (post referenciales UX redesign — ADR-007)
**Audiencia**: devs que agregan features, abren PRs, o hacen code review.

Este documento complementa a `ADR-001-feature-first-architecture.md` y al `CLAUDE.md` raíz. Si un patrón entra en conflicto con el CLAUDE.md, el CLAUDE.md tiene precedencia.

---

## 1. Dónde va cada cosa

| Tipo de código | Ubicación | Regla |
|---|---|---|
| Lógica de dominio (queries Prisma, validaciones Zod, utilidades de negocio) | `src/features/<feature>/lib/` | Cada feature autocontenido |
| Componentes UI de un feature | `src/features/<feature>/components/` | <200 líneas por archivo |
| Server actions de un feature | `src/features/<feature>/actions/` | React 19 Server Actions |
| Hooks de un feature | `src/features/<feature>/hooks/` | Prefijados con `use` |
| Tipos del feature | `src/features/<feature>/types/` | Sub-exportados desde el barrel |
| Rutas API del feature | `src/app/api/<feature>/route.ts` | **Handler delgado** que delega a `features/<feature>/lib/` |
| Páginas del feature | `src/app/<ruta>/page.tsx` | Thin — importa desde `@/features/<feature>` |
| Primitivos UI (button, input, card, dialog) | `src/shared/components/ui/` | shadcn-style, sin lógica de negocio |
| Layout (Navbar, Footer, Sidenav) | `src/shared/components/layout/` | Usado por todas las páginas |
| Utilidades compartidas (prisma, supabase, auth, utils, zod) | `src/shared/lib/` | Infra — no depende de features |
| Hooks compartidos | `src/shared/hooks/` | Usados por ≥2 features |
| Tipos compartidos | `src/shared/types/` | Re-exports de Prisma + shapes de API |
| Constantes globales (comunas, regiones) | `src/shared/constants/` | Datos estáticos cross-feature |
| Ambient type declarations | `src/types/*.d.ts` | `.d.ts` files — Next.js convention, no mover |

---

## 2. Reglas de dependencias (enforzadas por `eslint-plugin-boundaries`)

```
feature ──→ shared        ✅
feature ──→ otro feature  ❌ ERROR (lint bloquea PR)
feature ──→ externo (npm) ✅

shared  ──→ shared        ✅
shared  ──→ feature       ❌ ERROR
shared  ──→ app           ❌ ERROR

app     ──→ cualquiera    ✅ (app es el routing layer)
```

**Ejemplo de violación**:

```ts
// ❌ MAL: features/profiles importa de features/networking
import { ConnectionButton } from '@/features/networking';

// ✅ BIEN: si profiles necesita mostrar un botón de conexión,
// el botón sube a shared/ o profiles acepta un slot como prop.
```

---

## 3. Anatomía de un feature nuevo

Cuando agregas un feature nuevo (ej. `tasaciones`):

```
src/features/tasaciones/
├── README.md           # scope, API, dependencies, pendientes
├── index.ts            # barrel público (único punto de entrada)
├── components/
│   ├── TasacionCard.tsx
│   └── ...
├── hooks/
│   └── useTasacion.ts
├── lib/
│   ├── queries.ts      # funciones Prisma
│   ├── validations.ts  # Zod schemas
│   └── utils.ts
├── types/
│   └── index.ts
└── actions/            # opcional (server actions)
```

**Checklist al crear un feature**:

- [ ] `README.md` con scope, estructura, API pública, dependencias permitidas, consumidores, pendientes
- [ ] `index.ts` barrel que exporta solo la API pública (NO todo con `export *`)
- [ ] Ningún archivo >200 líneas (descomponer en sub-componentes + hooks)
- [ ] Imports internos **relativos** (`../lib/queries`), imports externos **con alias** (`@/shared/lib/prisma`)
- [ ] Lint pasa (boundaries + a11y + TS)
- [ ] Al menos 1 test unitario en `lib/` si contiene lógica no trivial

---

## 4. Handlers API delgados

Las rutas en `src/app/api/` **NO** deben contener lógica de negocio. Solo:

1. Auth check
2. Parseo + validación del body (Zod)
3. Llamada a una función del feature correspondiente
4. Shape de la respuesta

**Ejemplo** (`src/app/api/posts/route.ts`):

```ts
import { auth } from '@/shared/lib/auth';
import { listPostsByUser, createPostForUser, createPostSchema } from '@/features/posts';

export async function POST(request: NextRequest) {
  const user = await auth();
  if (!user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const parsed = createPostSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const post = await createPostForUser(user.id, parsed.data);
  return NextResponse.json({ success: true, post });
}
```

Regla: si una route tiene más de ~60 líneas, probablemente hay lógica que debería estar en `features/<feature>/lib/`.

---

## 5. Barrels (`index.ts`)

**Sí** usar barrels en:
- La raíz de cada feature (`src/features/<feature>/index.ts`) — define la API pública
- La raíz de `src/shared/hooks/`, `src/shared/types/` — exponen un conjunto coherente

**No** usar barrels en:
- Subcarpetas de componentes de un feature (`features/posts/components/index.ts`) — innecesario, agrega indirección
- `src/shared/lib/` — cada archivo se importa por su ruta explícita (`@/shared/lib/prisma`)

**Nunca** usar `export *`:

```ts
// ❌ MAL: expone todo, incluido código privado
export * from './lib/queries';

// ✅ BIEN: API pública explícita
export {
  listPostsByUser,
  createPostForUser,
  type CreatePostInput,
} from './lib/queries';
```

---

## 6. Aliases de TypeScript

Solo tres aliases oficiales:

```jsonc
"@/*":         "./*"           // fallback — usar con moderación
"@/app/*":     "./app/*"       // routing/pages
"@/features/*": "./features/*"
"@/shared/*":  "./shared/*"
```

**Los aliases viejos** (`@/lib/*`, `@/components/*`, `@/hooks/*`, `@/types/*`, `@/utils/*`, `@/constants/*`) **fueron removidos** en Sprint 3. No reintroducirlos.

---

## 7. Server Components, Client Components y `'use client'`

- **Default**: Server Component. No poner `'use client'` a menos que el componente use state, effects, o browser APIs.
- **`'use client'`** va en:
  - Componentes con `useState`, `useEffect`, `useRef`, `useRouter`, etc.
  - Componentes con handlers `onClick`, `onChange`, etc.
  - Componentes que importan librerías browser-only (Leaflet, Chart libraries sin SSR)
- **Leaflet / mapas**: importar con `next/dynamic` y `ssr: false`. Ver `src/app/referenciales/page.tsx` como referencia.

---

## 8. Auth

**Server components / API routes**:

```ts
// soft check (null si no autenticado)
import { getUser, getProfile } from '@/shared/lib/supabase/auth';
const user = await getUser();

// hard check (redirige)
import { requireAuth } from '@/shared/lib/supabase/auth';
const user = await requireAuth();
```

**Client components**:

```ts
import { useAuth } from '@/shared/hooks';
const { user, profile, isLoading, isAuthenticated, isAdmin } = useAuth();
```

NextAuth ya no existe en el proyecto. No usar `@/lib/auth` (path viejo removido).

---

## 9. Validación con Zod

- Las validaciones viven en `features/<feature>/lib/validations.ts`
- Re-exportar el schema desde el barrel del feature
- Usar `safeParse` en handlers API para obtener errores estructurados

```ts
const parsed = createPostSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: 'Datos inválidos', details: parsed.error.flatten() },
    { status: 400 }
  );
}
// parsed.data es typesafe
```

---

## 10. Manejo de errores Prisma

Siempre mapear errores comunes a códigos HTTP:

| Prisma error | HTTP |
|---|---|
| `P2002` (unique constraint) | 409 Conflict |
| `P2025` (record not found) | 404 Not Found |
| Cualquier otro | 500 + log |

---

## 11. Límite de 200 líneas por componente

Si un componente crece más allá de 200 líneas, **descomponerlo** antes de commitear. Estrategias:

1. **Extraer secciones**: si el componente tiene "bloques" visuales, crear subcomponentes (`sections/BasicInfo.tsx`, `sections/Professional.tsx`, etc.). Ver `features/profiles/components/ProfileEditForm.tsx` como referencia.
2. **Extraer estado a un hook**: si hay mucho `useState`, `useEffect`, lógica de formulario, moverlo a `hooks/useXForm.ts`. Ver `features/profiles/hooks/useProfileForm.ts`.
3. **Extraer constants**: arrays/options largos van a `lib/constants.ts`.
4. **Primitivos reutilizables**: si el mismo `<input>` + `<label>` + `<hint>` se repite, extraer un `FormSection.tsx` con `TextField`, `SelectField`, etc.

---

## 12. Tests

- Unit tests: `__tests__/` o junto al archivo (`foo.test.ts`)
- Preferir tests de la capa `lib/` (funciones puras / queries)
- Mockear Prisma en tests de lib
- Tests de componentes solo para lógica no trivial (no para cada prop drilling)

```bash
npm run test                # Jest
npm run test:api            # API tests
npm run test:e2e            # Playwright
```

---

## 13. Cuándo crear un feature vs meter en shared

**Señal de que algo es un feature**:
- Representa un dominio de negocio (posts, profiles, networking, tasaciones, eventos, chat)
- Tiene su propio modelo de datos (tabla Prisma)
- Tiene su propio set de API routes
- Sus componentes tienen semántica de dominio (no son primitivos genéricos)

**Señal de que algo va en shared**:
- Usado por ≥2 features
- No tiene semántica de dominio (button, card, dialog, form primitives)
- Infraestructura (supabase client, prisma, auth, utils)
- Constantes estáticas (comunas, regiones, professions)

**Duda razonable**: empieza en un feature. Si después detectas que otro feature lo necesita, súbelo a shared en una PR dedicada.

---

## 14. Flujo para cambiar el schema de Prisma

1. Editar `prisma/schema.prisma`
2. `npm run prisma:generate` (regenera el cliente TypeScript)
3. Copiar la SQL manualmente al Supabase SQL editor (no usar `prisma migrate`)
4. Actualizar los tipos en `src/shared/types/index.ts` si el cambio afecta enums re-exportados
5. Commit tanto el `schema.prisma` como los cambios en código que usen el nuevo schema

**Nota:** La tabla `posts` tiene columnas legacy fuera del Prisma schema — verificar queries raw al hacer cambios.

---

## 15. Convenciones de naming

| Qué | Convención | Ejemplo |
|---|---|---|
| Componentes React | `PascalCase.tsx` | `ProfileEditForm.tsx` |
| Hooks | `useCamelCase.ts` | `useProfileForm.ts` |
| Utilidades / lib | `kebab-case.ts` o `camelCase.ts` | `queries.ts`, `validations.ts` |
| Carpetas de features | `kebab-case` en plural | `posts/`, `profiles/`, `github-stars/` |
| Carpetas internas | `camelCase` o `kebab-case` | `components/`, `hooks/`, `lib/` |
| Archivos de constantes | `camelCase.ts` | `constants.ts`, `comunas.ts` |

---

## 16. Commits y PRs

Ver `CLAUDE.md` raíz para el formato de commits. Reglas cortas:

- Mensajes en inglés, descriptivos, primera línea <72 caracteres
- Un PR por feature/bug fix, no big-bang
- Si tocas un feature, actualiza su `README.md` si el scope cambió
- Ejecuta `npx next lint` antes de commit — boundaries violations bloquean merge

---

## 17. Estilos — solo tokens semánticos

**Regla dura**: en `className`, usá los **tokens semánticos** de Tailwind (`primary`, `foreground`, `background`, `card`, `muted`, `accent`, `destructive`, `border`, `ring`). **No uses** clases raw de la paleta de Tailwind como `text-blue-600`, `bg-sky-100`, `border-indigo-500`.

```tsx
// ❌ MAL — clases raw del template original
<button className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500">

// ✅ BIEN — tokens semánticos
<button className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary">
```

**Por qué**: los tokens semánticos viven en `globals.css` como CSS vars. Cambiar el color primary de amarillo a rojo es editar 1 archivo. Usar `bg-blue-600` hardcodeado rompe el sistema — cuando hagamos rebranding o agreguemos dark mode, esos usos quedan fuera.

**Tokens disponibles** (los 12 de shadcn/ui): `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `border`, `input`, `ring`.

**Variantes con opacidad**: en vez de tener escalas fijas (`primary-50`, `primary-100`, ..., `primary-950`), usá el modifier `/NN`:

```tsx
<div className="bg-primary/10">   {/* 10% opacity — background subtle */}
<div className="bg-primary/20">   {/* 20% — chip background */}
<div className="bg-primary/90">   {/* 90% — hover state */}
```

Escala práctica: `/5` (casi invisible), `/10` (subtle bg), `/20` (chip), `/30` (border), `/50` (disabled), `/80` (hover), `/90` (active).

**Grises neutros y rojos de error** son válidos con clases raw porque no forman parte del branding:

```tsx
<p className="text-gray-600">Texto secundario OK</p>
<div className="bg-red-50 text-red-700">Error banner OK</div>
```

Para más detalles, cómo agregar un token nuevo, y troubleshooting: [`docs/design-system.md`](../design-system.md).

---

## 18. SSR-safe hooks — `createClient()` solo dentro de `useEffect`

**Regla**: en un client component/hook (`'use client'`), **nunca** llamar `createClient()` (ni nada que dependa de env vars opcionales) en el cuerpo del componente. Hacerlo SOLO dentro de `useEffect` o un event handler.

### Por qué

Next.js renderiza los client components también durante el prerender SSR para producir el HTML inicial. Si el cuerpo del hook invoca `createClient()`, ese código corre server-side al build. Si `NEXT_PUBLIC_SUPABASE_*` no están inlined en el bundle (caso típico: env "Preview" de Vercel donde faltan vars que sí están en "Production"), `@supabase/ssr` tira sincrónicamente y el build falla:

```
Error occurred prerendering page "/blog".
Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

### Patrón malo

```tsx
'use client'
export function useAuth() {
  const supabase = createClient();  // ❌ corre durante prerender
  useEffect(() => { ... }, []);
}
```

### Patrón correcto

```tsx
'use client'
export function useAuth() {
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch (e) {
      console.error('[useAuth] Init failed:', e);
      setIsLoading(false);
      return;
    }
    // ...resto del effect (subscribe, fetchs)
  }, []);

  const signOut = async () => {
    // Event handlers también son seguros: no corren durante prerender.
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'local' });
  };
}
```

### Cómo verificar localmente

```bash
# Mueve .env.local temporalmente y corre el build
mv .env.local /tmp/env-bak && (npx next build; mv /tmp/env-bak .env.local)
```

Si el build pasa y `/blog` aparece como `○ (Static)` en el output, el patrón está bien aplicado. Si falla con `@supabase/ssr: Your project's URL and API key are required`, algún hook o componente está llamando `createClient()` fuera de un `useEffect`/handler.

### Otros objetos que pueden caer en el mismo trap

Cualquier constructor que lea `process.env.NEXT_PUBLIC_*` y falle si no existe: clientes de otros proveedores (Mapbox GL, PostHog, Sentry browser SDK) — aplicar la misma regla.

Historia y decisión completa: [ADR-007 sección 8](../adr/ADR-007-referenciales-ux-redesign.md).

---

## 19. Referencias

- [`docs/arquitectura/ROADMAP-refactor.md`](./ROADMAP-refactor.md) — historia y métricas del refactor
- [`docs/adr/ADR-001-feature-first-architecture.md`](../adr/ADR-001-feature-first-architecture.md) — decisión formal
- [`docs/adr/ADR-003-design-tokens-two-layer-system.md`](../adr/ADR-003-design-tokens-two-layer-system.md) — design tokens
- [`docs/adr/ADR-004-public-route-group-and-shared-account-menu.md`](../adr/ADR-004-public-route-group-and-shared-account-menu.md) — route groups y navegación compartida
- [`docs/adr/ADR-005-dual-backend-supabase-neon.md`](../adr/ADR-005-dual-backend-supabase-neon.md) — dual-backend Supabase + Neon
- [`docs/adr/ADR-006-sofia-rag-gemini-integration.md`](../adr/ADR-006-sofia-rag-gemini-integration.md) — Sofia RAG + Gemini
- [`docs/adr/ADR-007-referenciales-ux-redesign.md`](../adr/ADR-007-referenciales-ux-redesign.md) — routing split, clustering, PII masking, gating, SSR-safe
- [`docs/design-system.md`](../design-system.md) — guía operativa del color system
- [`CLAUDE.md`](../../CLAUDE.md) — estándares globales del proyecto
- Cada feature tiene su propio `README.md` con detalles específicos
