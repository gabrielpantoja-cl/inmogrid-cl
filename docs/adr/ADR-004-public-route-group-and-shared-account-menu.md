# ADR-004: Route group `(public)` + primitivo compartido `AccountMenu`

**Estado**: Aceptado
**Fecha**: 2026-04-11
**Decisores**: equipo de inmogrid.cl
**Contexto de ejecución**: Unificación del chrome de navegación y del menú de cuenta en todas las rutas de la app (públicas + dashboard)

---

## Contexto

Hasta 2026-04-11 la app no tenía un patrón consistente de navegación para las rutas públicas. Había cuatro problemas entrelazados:

### 1. Cada ruta pública inventaba su propio navbar

- **`/`** (landing) renderizaba un navbar inline con 150 líneas acopladas al componente de feed.
- **`/notas/[slug]`** (detalle de post) tenía un mini-breadcrumb `inmogrid / Publicaciones` pero **sin** botones de login/logout.
- **`/[username]`** (perfil público) y **`/[username]/notas/*`** renderizaban **sin navbar** — un usuario no autenticado que entraba por un link compartido a un perfil **no tenía ninguna forma de loguearse desde ahí**.
- **`/referenciales`** (mapa) tenía otro mini-nav con link a "Inicio" pero sin login.
- **`/privacy`** y **`/terms`** eran texto plano sin chrome.
- **`/dashboard/*`** sí tenía un navbar completo (`src/shared/components/layout/dashboard/navbar/`) con su propio user menu dropdown.

El resultado eran ~5 variantes visuales y de comportamiento del mismo concepto ("arriba a la derecha muestra si estoy logueado o no"), ninguna de ellas escalable.

### 2. El menú de cuenta vivía en la carpeta equivocada

Los componentes del menú de cuenta (`UserMenu.tsx`, `DeleteAccountDialog.tsx`) y el hook que combinaba `useAuth + useDeleteAccount + estado de menús` (`useNavbarActions.ts`) vivían bajo `src/shared/components/layout/dashboard/navbar/`. Esta ubicación era semánticamente errónea:

- El dropdown de cuenta no es "dashboard-específico" — cualquier layout que necesite login/logout/delete debe poder consumirlo.
- El hook se llamaba `useNavbarActions` pero no tenía nada que ver con la navegación — encapsulaba el estado de la sesión y del modal de delete.
- Cualquier otro layout que quisiera reutilizar el dropdown tenía que importar desde `dashboard/navbar/*`, acoplándose a una carpeta conceptualmente privada.

### 3. Sesiones stale causaban UI desincronizada

Con los 4 users de `auth.users` reducidos a 1 en el mismo día (ver post-mortem privado), un user con sesión activa a un `auth.users.id` ya borrado veía:

- **Navbar cliente-side** (vía `useAuth()` + `onAuthStateChange`) mostrando "Hola, {email}" porque el JWT en cookies seguía decodificándose.
- **Server component** (vía `supabase.auth.getUser()` → HTTP a Supabase Auth) mostrando "Inicia sesión…" porque el server validaba contra la DB y el user no existía.

Las dos capas no coincidían. Arreglamos el side effect en el middleware (ver sección "Sesiones stale" más abajo), pero además había que asegurar que **todos** los headers de la app compartan exactamente el mismo comportamiento para que un fix de este tipo se aplique en un solo lugar.

### 4. Paths hardcodeados al source en server components

`src/app/privacy/page.tsx` y `src/app/terms/page.tsx` leían sus respectivos `content.md` con:

```ts
const contentPath = path.join(process.cwd(), 'src/app/privacy/content.md');
```

Ese patrón es frágil: se rompe ante cualquier refactor que mueva físicamente el archivo. Lo cual pasó exactamente en este ADR cuando movimos `privacy/` al route group `(public)/`.

---

## Decisión

### Capa 1 — Primitivo compartido `common/account-menu`

Extraer los componentes de menú de cuenta fuera de `dashboard/navbar/` y moverlos a una carpeta neutral:

```
src/shared/components/layout/common/account-menu/
├── AccountMenu.tsx           # ex UserMenu.tsx — presentacional puro (avatar + dropdown)
├── DeleteAccountDialog.tsx   # modal de confirmación, sin cambios internos
├── useAccountActions.ts      # ex useNavbarActions.ts — estado + handlers de sesión
└── index.ts                  # barrel export
```

Los tres archivos se importan desde cualquier layout vía:

```ts
import {
  AccountMenu,
  DeleteAccountDialog,
  useAccountActions,
} from '@/shared/components/layout/common/account-menu'
```

- **`AccountMenu`** es **presentacional puro**: recibe `avatarUrl`, `isOpen`, handlers como props y no sabe nada de sesión.
- **`useAccountActions`** es el **único** punto donde vive la lógica de sesión + modal de delete. Cualquier consumidor (dashboard navbar, `PublicHeader`, futuros layouts) llama `useAccountActions()` y obtiene el mismo set de funciones y estado.
- **`DeleteAccountDialog`** es el modal — sin cambios de API con respecto al original.

### Capa 2 — Composiciones contextuales

Sobre el primitivo se construyen **dos composers** con chrome distinto según el contexto:

- **`src/shared/components/layout/dashboard/navbar/index.tsx`** — navbar del dashboard, con links `Feed / Mi Perfil / Mis Publicaciones / Explorar / Comunidad`, sidenav móvil, y el dropdown `AccountMenu` a la derecha.
- **`src/shared/components/layout/public/PublicHeader.tsx`** — header para rutas públicas, con link a `Referenciales`, y el mismo `AccountMenu` dropdown (o un botón "Iniciar sesión con Google" cuando no hay sesión).

Ambos consumen los mismos 3 primitivos. Cuando mañana cambie el comportamiento del sign-out (ej. agregar telemetría), se toca `useAccountActions` y ambos lados se comportan idénticamente.

### Capa 3 — Route group `(public)`

Agrupar todas las rutas públicas bajo `src/app/(public)/` con un layout compartido que monta `PublicHeader` una sola vez:

```
src/app/
├── (public)/                  ← route group, no afecta URLs
│   ├── layout.tsx             ← monta <PublicHeader /> + {children}
│   ├── page.tsx               → /
│   ├── notas/[slug]/page.tsx  → /notas/[slug]
│   ├── [username]/            → /[username], /[username]/notas, /[username]/notas/[slug]
│   ├── referenciales/page.tsx → /referenciales
│   ├── privacy/page.tsx       → /privacy
│   └── terms/page.tsx         → /terms
├── dashboard/                 ← su propio layout con navbar del dashboard
├── auth/                      ← login, callback, error (sin chrome)
├── api/
├── chatbot/                   ← embed sin chrome
├── login/                     ← redirect → /auth/login
└── layout.tsx                 ← root layout (fonts, providers, footer)
```

**Route groups en Next.js App Router** son directorios con paréntesis `(xxx)` que sirven exclusivamente para compartir layouts / organizar el árbol **sin alterar la URL**. Es decir, `src/app/(public)/notas/[slug]/page.tsx` sigue respondiendo en `/notas/[slug]`. Los paréntesis son sintaxis del router, no parte del path.

Esto permite tres cosas:

1. **Cero duplicación de chrome**. El `PublicHeader` se monta exactamente una vez (en el layout del grupo) y se hereda a todas las rutas hijas.
2. **Extensibilidad trivial**. Cualquier ruta pública futura (`/eventos`, `/profesionales/[slug]`, `/legal/privacy-v2`) se crea con `mkdir src/app/(public)/nueva-ruta` y hereda el header sin una línea extra.
3. **URL stability**. Cero links rotos, cero SEO regressions, cero redirects necesarios — los paths públicos siguen idénticos.

### Capa 4 — Protección de rutas movida al nivel de página

Con el cambio, el middleware ya **no protege `/dashboard` por path matching**:

```ts
// src/middleware.ts
const PROTECTED_PATHS: string[] = []   // antes: ['/dashboard']
```

La razón es que el path-matching en el middleware es una protección **coarse-grained** que no sabe distinguir entre subrutas del dashboard que requieren auth (`/dashboard/perfil`, `/dashboard/notas/crear`) y las que son informativas (`/dashboard` overview que muestra el feed público). Para que usuarios no autenticados vean el feed del dashboard overview (pedido explícito del producto — "como Reddit"), el middleware no puede bloquear `/dashboard` entero.

La protección ahora vive **en cada server component** que la necesita:

```ts
// src/app/dashboard/notas/page.tsx
export default async function NotasPage() {
  const user = await requireAuth()   // redirige a /auth/login si no hay sesión
  // ...
}

// src/app/dashboard/(overview)/page.tsx
export default async function DashboardPage() {
  const user = await getUser()       // null si no hay sesión — el componente lo maneja
  // ...
}
```

Esta es la forma idiomática en App Router y es más **granular y explícita** que el path matching en middleware.

### Capa 5 — Sesiones stale auto-limpiadas en middleware

El `updateSession` de `src/shared/lib/supabase/middleware.ts` ahora detecta JWTs huérfanos (cookie válida con un `sub` que ya no existe en `auth.users`) y los limpia:

```ts
const { data: { user }, error } = await supabase.auth.getUser()

const hasSupabaseAuthCookie = request.cookies
  .getAll()
  .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

if (!user && error && hasSupabaseAuthCookie) {
  await supabase.auth.signOut({ scope: 'local' })
}
```

`signOut({ scope: 'local' })` no hace HTTP a `/auth/v1/logout`: solo emite `Set-Cookie` de expiración para los tokens. Al siguiente request, tanto el cliente como el server ven `user = null` y la UI queda consistente.

### Capa 6 — Content paths relativos al proyecto (no al archivo)

Los `content.md` de `/privacy` y `/terms` viajaron junto a sus `page.tsx` al moverse al route group. Las páginas ahora leen:

```ts
const contentPath = path.join(
  process.cwd(),
  'src/app/(public)/privacy/content.md'   // paréntesis literales — Next.js los maneja OK
)
```

Esto es una solución **pragmática**, no ideal. Ver "Deuda técnica latente" abajo para opciones más robustas.

---

## Consecuencias

### Positivas

- **Consistencia visual y de comportamiento cross-layout**. El dropdown "Cerrar Sesión / Eliminar Cuenta / Términos / Privacy" es pixel-idéntico en el dashboard y en las rutas públicas. Mismos tokens de color (`primary`, `primary-foreground` de ADR-003), mismas transiciones, mismos estados de loading.
- **Single source of truth para sesión/delete**. Un solo `useAccountActions` que tanto el dashboard navbar como el `PublicHeader` consumen. Cambiar "Cerrar sesión" significa editar un archivo.
- **Login/logout accesible desde cualquier ruta pública**. Antes no se podía cerrar sesión desde `/[username]`, `/referenciales`, `/privacy` ni `/terms` porque no había chrome. Ahora sí.
- **Nuevas rutas públicas heredan el header automáticamente**. Agregar `/eventos` mañana es literalmente `mkdir src/app/(public)/eventos && touch page.tsx`, sin tocar nada del layout.
- **Código borrado**. ~100 líneas de navbar hardcoded en 3 páginas distintas + 3 archivos duplicados en `dashboard/navbar/` (movidos a `common/`). Menos superficie de drift.
- **Protección granular**. Cada server component declara su propio `requireAuth()` donde lo necesita, sin confiar en path matching del middleware.
- **Sesiones stale auto-curadas**. El middleware limpia cookies huérfanas sin intervención manual — robustez ante operaciones destructivas sobre `auth.users`.

### Negativas

- **Curva de aprendizaje de route groups**. Un contributor nuevo que no conozca Next.js App Router puede confundirse con los paréntesis: "¿por qué `(public)` no aparece en la URL?" Mitigación: este ADR + comentario explicativo en `src/app/(public)/layout.tsx`.
- **Paths con paréntesis son torpes en bash**. `cd 'src/app/(public)'` requiere quotes. Mitigación: trabajar desde el repo root con paths absolutos; los IDE manejan los paréntesis sin problemas.
- **`process.cwd()` + path literal con paréntesis** funciona hoy pero es frágil a refactors futuros. Ver deuda pendiente abajo.
- **Un breadcrumb cosmético se perdió en `/notas/[slug]`**. Antes decía "inmogrid / Publicaciones". Ahora hay un breadcrumb compacto "Publicaciones / {título}" debajo del `PublicHeader`. Pérdida neta: el logo "inmogrid" en el breadcrumb (redundante con el del `PublicHeader`).

### Deuda técnica latente

**Paths de markdown hardcodeados**. El patrón `path.join(process.cwd(), 'src/app/(public)/…/content.md')` es frágil:

1. Se rompe cada vez que se mueva el archivo (ya pasó una vez en este ADR).
2. No funciona bien con `output: 'standalone'` — el file tracer de Next.js no siempre copia `.md` relativos al cwd si no son trackeables estáticamente.
3. Acopla ubicación física del source con runtime I/O.

**Opciones a futuro:**

| Opción | Descripción | Trade-off |
|---|---|---|
| **A — Import literal** | `import content from './content.md?raw'` | Requiere configurar un webpack/turbopack loader (5 líneas en `next.config.js`). El bundler trackea la dependencia automáticamente. |
| **B — `fileURLToPath(import.meta.url)`** | Resolver relativo al archivo, no al cwd | Conflictivo con chunks serverless de Next.js, no siempre funciona. |
| **C — Mover a `content/legal/*.md`** | Paths fuera de `src/app/`, estables ante refactors de rutas | Pierdes la co-ubicación del markdown con su page. |

**Recomendación**: Opción C cuando haya tiempo. Mueve `content.md` a `content/legal/privacy.md` y `content/legal/terms.md`, y cambia el `contentPath` a `path.join(process.cwd(), 'content/legal/privacy.md')`. Es portable, trackeable por git, y el path deja de depender de la arquitectura del router.

---

## Alternativas consideradas

### 1. Scatter de `PublicHeader` en cada `page.tsx`

**Rechazada.** Requeriría editar 6+ archivos para agregar el header a cada ruta pública, y cada nueva ruta futura requeriría recordar importar el componente. No es escalable.

### 2. Meter `PublicHeader` en el `src/app/layout.tsx` raíz

**Rechazada.** El root layout sirve a **todas** las rutas, incluyendo `/dashboard/*` (que ya tiene su propio navbar) y `/chatbot` / `/auth/*` (que no deben tener chrome). Habría que agregar lógica condicional basada en `usePathname()` en un server component, lo cual rompe el modelo de rendering o requiere convertir el root layout a client component. Feo.

### 3. Mantener el componente compartido en `dashboard/navbar/`

**Rechazada.** Semánticamente errónea. El dropdown de cuenta no pertenece conceptualmente al navbar del dashboard, y forzar a las rutas públicas a importar desde `dashboard/navbar/*` crea un acoplamiento artificial entre el layout público y el privado.

### 4. Duplicar el componente entre ambos layouts

**Rechazada.** Se vuelve imposible garantizar que ambos dropdowns se comporten idénticamente. Cualquier fix de seguridad o UX tendría que aplicarse manualmente en dos lugares.

### 5. Usar un `<ConditionalHeader />` client component con `usePathname()`

**Considerada.** Un componente que inspecciona `pathname`, renderiza `DashboardNavbar` si está en `/dashboard/*`, `PublicHeader` si está en rutas públicas, y `null` en `/chatbot` / `/auth/*`. Funciona técnicamente pero (a) convierte algo que debería ser un layout estático en un componente cliente con `"use client"`, (b) mezcla decisiones de layout con decisiones de UI, (c) cada render cliente tiene que recalcular qué header mostrar. Route groups son la solución idiomática de App Router para exactamente este problema.

---

## Archivos pivote

- `src/shared/components/layout/common/account-menu/index.ts` — barrel export del primitivo compartido
- `src/shared/components/layout/common/account-menu/AccountMenu.tsx` — dropdown presentacional
- `src/shared/components/layout/common/account-menu/useAccountActions.ts` — hook de sesión + delete
- `src/shared/components/layout/common/account-menu/DeleteAccountDialog.tsx` — modal de confirmación
- `src/shared/components/layout/public/PublicHeader.tsx` — header de rutas públicas
- `src/shared/components/layout/dashboard/navbar/index.tsx` — navbar del dashboard (ahora consume `common/account-menu`)
- `src/app/(public)/layout.tsx` — layout del route group, monta `PublicHeader`
- `src/app/dashboard/layout.tsx` — layout del dashboard (sin cambios estructurales)
- `src/middleware.ts` — `PROTECTED_PATHS` vacío
- `src/shared/lib/supabase/middleware.ts` — auto-limpieza de cookies huérfanas

## Relacionados

- [ADR-001 — Feature-first architecture](ADR-001-feature-first-architecture.md) — el feature-first original, este ADR es compatible (no toca `src/features/`).
- [ADR-003 — Design tokens two-layer system](ADR-003-design-tokens-two-layer-system.md) — el `AccountMenu` y `PublicHeader` usan exclusivamente tokens semánticos (`primary`, `primary-foreground`, `muted`, etc.).
- [`docs/authentication.md`](../authentication.md) — flujo de Supabase Auth con Google OAuth.
- [`docs/architecture.md`](../architecture.md) — estructura general del repo; la sección "Protección de rutas" refleja `PROTECTED_PATHS = []`.
