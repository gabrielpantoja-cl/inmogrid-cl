# Arquitectura técnica

Este documento describe el stack y la estructura interna de `inmogrid.cl`. Si vas a contribuir código, empieza por aquí.

---

## Stack

| Capa | Tecnología | Rol |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR, Server Components, API routes |
| Runtime UI | React 19 | Concurrent features, useTransition, Server Actions |
| Lenguaje | TypeScript 5 (strict) | Tipado estricto obligatorio |
| Estilos | Tailwind CSS + shadcn-style primitives (Radix) | Sistema de diseño — ver [`design-system.md`](design-system.md) |
| Design tokens | CSS vars en `globals.css` ↔ Tailwind | Two-layer system — ver [ADR-003](adr/ADR-003-design-tokens-two-layer-system.md) |
| ORM | Prisma 6 | Supabase únicamente (Neon usa `postgres.js` raw) |
| Base de datos — Supabase | PostgreSQL | Profiles, posts, forum, events, contributions — **read/write** |
| Base de datos — Neon | PostgreSQL + PostGIS | Referenciales (~21 k transacciones) + conservadores — **read-only**, ver [ADR-005](adr/ADR-005-dual-backend-supabase-neon.md) |
| Auth | Supabase Auth (Google OAuth) | Sesiones, tokens, callbacks |
| Storage | Supabase Storage | Imágenes de perfil y posts |
| IA — Sofia RAG (pausada) | Gemini 2.5 Flash + text-embedding-004 | Chatbot `/sofia` — **deshabilitado desde 2026-04-24**, código conservado en `features/sofia-chat/` y rutas en `_sofia-disabled/`. Ver [ADR-006](adr/ADR-006-sofia-rag-gemini-integration.md) para el status |
| Mapas | Leaflet + React Leaflet | Vista geoespacial |
| Clustering mapa | supercluster + `L.divIcon` custom | Clustering + spiderfy — ver [ADR-007](adr/ADR-007-referenciales-ux-redesign.md) |
| Geocoder | `leaflet-geosearch` + Nominatim | Búsqueda por dirección restringida a Chile |
| Editor rich-text | Tiptap 3 + sanitize-html | Hilos del foro, comentarios, posts del blog |
| Tabla de datos | `@tanstack/react-table` + shadcn-style primitives | Paginación + filtros URL-sync + truncado inteligente |
| Rate limiting | Upstash Redis | API pública (`/api/v1/*`) + endpoints mutantes del foro (por userId) — ver sección [Forum](#forum) |
| OG images | `next/og` (`ImageResponse`) | Generadas on-demand por hilo del foro en `/api/og/thread/[slug]` |
| Email | Resend | Transaccional |
| Hosting | Vercel | Deploy automático desde `main` |

Nota: el repo **no** usa NextAuth ni TanStack Query — ambas fueron reemplazadas por la capa nativa de Supabase y por Server Components/Server Actions respectivamente.

---

## Estructura del repositorio

```
src/
├── app/                    # App Router — rutas públicas y privadas
│   ├── (public)/           # Rutas públicas (landing, perfiles)
│   ├── dashboard/          # Rutas autenticadas
│   ├── api/
│   │   ├── public/         # API pública (sin auth, CORS abierto)
│   │   └── ...             # API privada (auth requerida)
│   └── auth/               # Login, callback, signout
├── features/               # Lógica de dominio organizada por feature
│   ├── conservadores/      # Directorio CBR (lee de Neon)
│   ├── forum/              # Hilos, comentarios, likes, bookmarks, reportes
│   ├── networking/         # Conexiones entre perfiles
│   ├── posts/              # Blog (admin) + notas de usuario
│   ├── profiles/           # Edición de perfil público
│   ├── referenciales/      # Mapa + tabla + contribuciones + PII masking
│   └── sofia-chat/         # RAG chatbot (pausado — ver ADR-006)
├── shared/
│   └── components/layout/  # Header, Footer, shells
├── components/ui/          # Primitivos shadcn/ui
├── lib/
│   ├── supabase/           # Clientes browser/server, helpers auth
│   ├── auth.ts             # Wrapper server
│   └── auth-utils.ts       # Wrapper client
├── hooks/                  # Hooks compartidos (useAuth, etc.)
└── middleware.ts           # Refresh de sesión Supabase
prisma/
└── schema.prisma           # Fuente de verdad del schema
docs/                       # Esta carpeta
```

Arquitectura **feature-first**: el código de dominio vive en `src/features/<feature>/` con su propia carpeta de `components`, `hooks`, `services`, `types`. Ver [adr/ADR-001-feature-first-architecture.md](adr/ADR-001-feature-first-architecture.md) y [arquitectura/patrones.md](arquitectura/patrones.md) para los detalles.

---

## Modelo de datos

### Supabase (Prisma, read/write)

Los modelos principales (ver `prisma/schema.prisma`):

| Modelo | Tabla | Rol |
|---|---|---|
| `Profile` | `profiles` | Usuario — `id` es UUID de `auth.users` |
| `Post` | `posts` | Publicaciones de usuarios |
| `ForumThread` | `threads` | Hilos del foro estilo Reddit — likes, bookmarks, tags, `editedAt` |
| `ForumComment` | `comments` | Comentarios con `parentId` para replies anidadas (2 niveles) |
| `ForumThreadLike` / `ForumThreadBookmark` | `thread_likes`, `thread_bookmarks` | Relaciones N:M (PK compuesta userId+threadId) |
| `ForumReport` | `forum_reports` | Reportes de hilos/comentarios — moderación post-publicación |
| `ForumNotification` | `forum_notifications` | Notifs para menciones, replies y comentarios en hilos propios |
| `Connection` | `connections` | Conexiones (networking) entre perfiles |
| `Event` | `events` | Agenda de eventos del sector |
| `ProfessionalProfile` | `professional_profiles` | Ficha profesional extendida |
| `Contribution` | `contributions` | Staging de referenciales aportados (pending → approved → Neon) |
| `SofiaDocument` / `SofiaConversation` / `SofiaMessage` | `sofia_*` | RAG chatbot — tablas conservadas, feature pausado (ADR-006) |
| `InmogridBadge` / `InmogridUserBadge` / `InmogridPointsLedger` | `badges`, `user_badges`, `points_ledger` | Gamificación |
| `AuditLog` | `audit_logs` | Bitácora de acciones sensibles |

> El prefijo `inmogrid_` fue eliminado en abril 2026 cuando el proyecto obtuvo una base Supabase dedicada. Si ves referencias a `inmogrid_profiles` o similares en docs antiguos, ya no aplican. Desde 2026-04-24 el proyecto Supabase `<supabase-project-ref>` es 100% de inmogrid.cl — las bases compartidas con proyectos hermanos quedaron discontinuadas.

### Neon (postgres.js, read-only)

| Tabla | Registros | Rol |
|---|---|---|
| `referenciales` | ~21.000 | Transacciones verificadas, con PostGIS `geom`, `monto` BigInt, `comprador`/`vendedor` como PII |
| `conservadores` | 91 | Directorio CBR (nombre, región, jurisdicción, contacto) |

Todo el SQL de Neon vive en `src/shared/lib/queries/referenciales.ts`. Ver [ADR-005](adr/ADR-005-dual-backend-supabase-neon.md) para el flujo completo.

**Campos relevantes** (convención Prisma camelCase ↔ Postgres snake_case):

- `fullName` ↔ `full_name`
- `avatarUrl` ↔ `avatar_url`
- `coverImageUrl` ↔ `cover_image_url`
- `isPublicProfile` ↔ `is_public_profile`
- `userId` ↔ `user_id`

**Enums clave:**

- `Role`: `user | admin | superadmin`
- `ProfessionType`: `TASADOR_PERITO`, `PERITO_JUDICIAL`, `CORREDOR_PROPIEDADES`, `ADMINISTRADOR_PROP`, `ABOGADO_INMOBILIARIO`, `ARQUITECTO`, `INGENIERO_CIVIL`, `ACADEMICO`, `FUNCIONARIO_PUBLICO`, `INVERSIONISTA`, `PROPIETARIO`, `OTRO`
- `EventType`: `TALLER | SEMINARIO | CHARLA | CURSO | OPEN_HOUSE | LANZAMIENTO`

**Migraciones de schema:** no usamos `prisma migrate`. El flujo es:

1. Editar `prisma/schema.prisma`
2. `npm run prisma:generate`
3. Generar el SQL manual en `prisma/migrations/YYYYMMDDHHMMSS_nombre/migration.sql`
4. Pegar el SQL en el SQL Editor de Supabase

La razón: aunque el proyecto Supabase ya no es compartido (desde abril 2026), mantenemos el control manual para auditar cada cambio antes de aplicarlo — no hay `prisma migrate deploy` en ningún ambiente. Los archivos `migration.sql` son la fuente de verdad del historial de cambios y quedan versionados en el repo.

**Triggers en `auth.users`**: desde 2026-04-24 no existe ningún trigger custom. La creación del row de `profiles` en signup es responsabilidad exclusiva de `src/app/auth/callback/route.ts` (que usa `generateUniqueUsername()` para evitar colisiones). Mantener esta política — los triggers anteriores rompieron dos veces por schema drift.

---

## Autenticación

Proveedor único: **Supabase Auth con Google OAuth**.

```
/auth/login
   └─> Supabase OAuth
         └─> Google
               └─> /auth/callback
                     └─> upsert en profiles
                           └─> redirect /dashboard
```

**Patrón en Server Components / API routes:**

```ts
import {
  getUser,
  getProfile,
  requireAuth,
  requireAdmin,
  requireProfessionalProfile,
  isAdminRole,
} from '@/shared/lib/supabase/auth'

// Soft check
const user = await getUser()                  // null si no hay sesión
const profile = user ? await getProfile(user.id) : null

// Hard check (redirige a /auth/login si no hay sesión)
const user = await requireAuth()

// Admin-only: redirige a /dashboard?error=admin_required si no es admin
const { user, profile } = await requireAdmin()

// Premium: redirige a /dashboard/perfil?complete=professional si falta
// Profile.profession. Usado por /dashboard/referenciales/tabla.
const { user, profile } = await requireProfessionalProfile()
```

Para **route handlers** (que deben retornar 403 en vez de redirect), hacer el check inline:

```ts
const authUser = await auth()
if (!authUser?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
const profile = await getProfile(authUser.id)
if (!isAdminRole(profile?.role)) {
  return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })
}
```

### Role matrix

| Rol | Foro (hilos / comentarios) | Blog (publicar / editar / borrar) | Tabla de referenciales |
|---|:---:|:---:|:---:|
| no autenticado | ❌ | ❌ | ❌ |
| `user` | ✅ | ❌ | Requiere `profession` seteada |
| `admin` / `superadmin` | ✅ | ✅ | ✅ |

`isAdminRole(role)` normaliza: `admin` y `superadmin` son ambos admin. **Usar siempre el helper**, no comparar strings sueltas.

Los roles se escalan **manualmente** desde el SQL Editor de Supabase — no hay UI de administración de roles. El patrón está descrito en `CLAUDE.md`.

**Patrón en Client Components:**

```ts
import { useAuth } from '@/shared/hooks/useAuth'
const { user, profile, isLoading, isAuthenticated, isAdmin } = useAuth()
```

> ⚠️ **SSR-safe**: `useAuth` llama `createClient()` **dentro** de `useEffect`, no en el cuerpo del hook. Esto evita que el prerender de Next.js falle si `NEXT_PUBLIC_SUPABASE_*` no están inlined en el bundle (caso Vercel Preview). Ver sección "SSR-safe hooks" en [`arquitectura/patrones.md`](arquitectura/patrones.md).

`src/middleware.ts` corre en cada request y refresca la sesión de Supabase vía cookies. **No** se usa para gating por rol/perfil — eso vive en cada server component con los helpers de arriba. El middleware está en edge runtime y no tiene acceso a Prisma.

---

## API

### `/api/v1/*` — Datos de referenciales (Neon, rate-limited, CORS abierto)

Ver [ADR-005](adr/ADR-005-dual-backend-supabase-neon.md) para el modelo dual-backend.

| Endpoint | Descripción |
|---|---|
| `GET /api/v1/map-data` | Referenciales georreferenciados (`comuna`, `anio`, `limit` hasta 50 k) |
| `GET /api/v1/map-data/comunas` | Comunas disponibles con conteos |
| `GET /api/v1/map-config` | Configuración estática del mapa |
| `GET /api/v1/health` | Health check dual-backend (Supabase + Neon) |
| `GET /api/v1/docs` | Documentación OpenAPI |

### `/api/public/*` — Datos de Supabase (sin auth)

| Endpoint | Descripción |
|---|---|
| `GET /api/public/health` | Estado del servicio (solo Supabase) |
| `GET /api/public/posts` | Feed de posts publicados |
| `GET /api/public/profiles/[username]` | Perfil público por username |
| `GET /api/public/threads` | Feed de hilos del foro con `?q=`, `?tag=`, `?sort=new\|hot\|top`, `?limit=`, `?offset=` |
| `GET /api/public/threads/[slug]` | Detalle de un hilo (incluye `contentHtml` completo — el listado solo trae preview) |

### `/api/og/*` — OG images dinámicas (sin auth, CDN-cached)

| Endpoint | Descripción |
|---|---|
| `GET /api/og/thread/[slug]` | Card de 1200×630 con título del hilo, autor, tags — renderizada con `next/og`. Cacheada 1h en Vercel, 24h en CDN |

### `/api/*` — Privada (requiere sesión)

| Endpoint | Descripción |
|---|---|
| `GET/PUT /api/users/profile` | Perfil propio |
| `GET/POST /api/posts` | Listar / crear posts propios |
| `GET/PUT/DELETE /api/posts/[id]` | Leer / editar / borrar un post propio |
| `POST /api/threads` | Crear hilo (rate-limit 5/h por user) |
| `PATCH/DELETE /api/threads/[id]` | Editar / borrar hilo — owner o admin |
| `POST /api/threads/[id]/like` | Toggle like (rate-limit 120/h) |
| `POST /api/threads/[id]/bookmark` | Toggle bookmark (rate-limit 120/h) |
| `POST /api/threads/[id]/comments` | Crear comentario — acepta `parentId` para replies anidadas (rate-limit 30/h) |
| `PATCH/DELETE /api/threads/[id]/comments/[commentId]` | Editar / borrar comentario — owner o admin |
| `POST /api/threads/[id]/report` | Reportar hilo (rate-limit 10/día) |
| `POST /api/threads/[id]/comments/[commentId]/report` | Reportar comentario |
| `GET/PATCH /api/notifications` | Listar (con `?unreadOnly=true`) / marcar leídas — polling 60s desde el bell |
| `GET /api/admin/reports` | Listado para panel de moderación — filtro `?status=` |
| `PATCH /api/admin/reports/[id]` | Transicionar status + ejecutar acción (`hide_thread`, `restore_thread`, `delete_comment`) |
| `GET /api/referenciales/map-data` | Referenciales con filtros avanzados + sin rate-limit |
| `POST /api/referenciales/contribute` | Crear contribución / reporte |
| `GET /api/referenciales/my-contributions` | Histórico propio |
| `GET /api/referenciales/contributions` | Admin — todas las pendientes |
| `POST /api/referenciales/contributions/[id]/review` | Admin — aprobar/rechazar |
| `DELETE /api/delete-account` | Baja de cuenta |
| `POST /api/revalidate` | Invalidación de cache Next.js |

> Las rutas `/api/sofia/chat` y `/api/chat` **no existen hoy**. `/api/sofia/chat`
> está físicamente bajo `src/app/api/_sofia-disabled/` (el prefix `_` excluye
> la folder del file-based routing de Next 15). `/api/chat` fue eliminado
> completo en el cleanup del 2026-04-24.

**Patrón de handler:**

```ts
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  // Validar input con Zod
  // Mapear errores Prisma: P2002 → 409, P2025 → 404
}
```

### Forum {#forum}

El foro es el **core del producto**. Vive en `src/features/forum/` y se renderiza en `/` (home), `/foro/[slug]` (detalle) y `/foro/[slug]/editar`. Diseño completo en [ADR-010](adr/ADR-010-forum-engagement.md).

**Capacidades** (al 2026-04-24):

- **Creación**: usuarios autenticados publican directo sin review. Editor Tiptap + sanitize-html server-side (colapsa `<p>` vacíos, whitelist de tags/classes). Rate-limit 5 hilos/hora por user.
- **Interacción**: likes, bookmarks, comentarios con replies anidadas hasta 2 niveles (el server reparentea al abuelo más allá), menciones `@usuario` linkificadas automáticamente, optimistic UI en todas las acciones.
- **Moderación**: owner y admin pueden editar/borrar. Usuarios pueden reportar con 5 motivos (spam, ofensivo, engañoso, ilegal, otro). Admin revisa en `/dashboard/admin/reportes` con acciones `hide_thread`/`restore_thread`/`delete_comment`, transacción atómica.
- **Notificaciones**: bell en header (polling 60s) con badge unread. Se generan en `createComment`/`createThread` para menciones, replies a comments propios, y comments en hilos propios. Tabla `forum_notifications` con RLS.
- **Feed**: infinite scroll via `IntersectionObserver` (rootMargin 400px), ordenamiento `new`/`hot` (últimos 7 días por `likeCount+commentCount`)/`top` (all-time). Estado sincronizado con URL (`?sort=hot`).
- **SEO**: canonical dinámico por hilo, `openGraph.url`, `openGraph.images` → `/api/og/thread/[slug]` (imagen 1200×630 con `next/og`), JSON-LD `DiscussionForumPosting` + `BreadcrumbList`. Sitemap cacheado 1h incluyendo todos los hilos publicados.
- **Rate limiting**: Upstash sliding window por userId, distintos buckets: `thread` (5/h), `comment` (30/h), `reaction` (120/h), `report` (10/día). Fail-open si Redis no está configurado.
- **Payload optimizado**: el listado trae solo `preview` (texto plano), el `contentHtml` completo se carga on-demand vía `/api/public/threads/[slug]` al expandir o al navegar al detalle — reduce payload del feed 3-5×.

**Archivos clave**:

- `src/features/forum/lib/queries.ts` — `listThreads`, `createThread`, `updateThread`, `createComment`, `toggleThreadLike`, `createForumReport`, `listReports`, `listNotifications`
- `src/features/forum/lib/sanitize.ts` — allowlist de tags + atributos, colapso de párrafos vacíos
- `src/features/forum/lib/mentions.ts` — parser `@username` con linkify post-sanitize
- `src/shared/components/forum/` — `ThreadFeed`, `ThreadCard`, `ThreadDetail`, `CommentItem`, `ReportDialog`, `SignInPromptDialog`, `NotificationBell`
- `src/shared/lib/ratelimit.ts` — `checkForumRateLimit(userId, action)`
- `prisma/migrations/20260423000000_forum_edited_at_and_reports/` — primer batch SQL
- `prisma/migrations/20260423000001_forum_replies_and_notifications/` — replies + notifs

### Server Actions (en `app/*/actions.ts`)

Para rutas del dashboard — el cliente las invoca como funciones async, Next genera el bridge. Misma defensa (auth check al inicio, Zod en input). Ejemplo: `src/app/dashboard/referenciales/tabla/actions.ts` expone `fetchReferencialesTable` con PII masking y heurística aplicados server-side.

---

## Protección de rutas

`src/middleware.ts` corre en todas las requests y aplica dos categorías:

```ts
PUBLIC_PATHS          = ['/auth/', '/api/auth/', '/api/public/', '/_next/', ...]
PROTECTED_PATHS: [] = []   // vacío — ver nota abajo
// cualquier otra ruta: pasa, pero la sesión se refresca en background
```

**La protección de rutas vive ahora en cada server component**, no en el middleware. El path-matching en middleware era demasiado coarse-grained para distinguir entre subrutas del dashboard que requieren auth (`/dashboard/perfil`, `/dashboard/notas/crear`) y las que son informativas (`/dashboard` overview, que muestra el feed público incluso a usuarios no autenticados, estilo Reddit).

El patrón ahora es:

```ts
// src/app/dashboard/notas/page.tsx — requiere sesión
const user = await requireAuth()          // redirige a /auth/login si falta

// src/app/dashboard/(overview)/page.tsx — soft, renderiza igual sin sesión
const user = await getUser()              // null si no hay sesión, el componente lo maneja
```

El middleware sigue corriendo `updateSession()` en cada request para refrescar los cookies de Supabase. Adicionalmente, detecta y auto-limpia **cookies huérfanas** (JWTs de `auth.users.id` que ya no existen — típico después de operaciones destructivas en la base):

```ts
// src/shared/lib/supabase/middleware.ts
const { data: { user }, error } = await supabase.auth.getUser()
if (!user && error && hasSupabaseAuthCookie) {
  await supabase.auth.signOut({ scope: 'local' })
}
```

Sin este branch, un cliente con sesión stale vería el navbar diciendo "Hola, {email}" (JWT cacheado) mientras el server component devolvía `null` ("Inicia sesión…") — UI desincronizada. Ver [ADR-004](adr/ADR-004-public-route-group-and-shared-account-menu.md#capa-5--sesiones-stale-auto-limpiadas-en-middleware).

---

## Layouts y chrome de navegación

La app tiene **dos layouts** separados por contexto, cada uno con su propio header, pero ambos consumen el **mismo primitivo de menú de cuenta** (`common/account-menu`) para garantizar consistencia cross-layout:

```
src/app/
├── (public)/          ← route group — no afecta URLs
│   └── layout.tsx     ← monta <TopBar /> + <LeftSidebar /> (shell estilo Reddit)
│       • /                       (landing con feed del foro)
│       • /foro/[slug], /foro/nuevo
│       • /blog, /blog/[slug]
│       • /[username]             (perfil público)
│       • /referenciales          (mapa público)
│       • /conservadores          (directorio CBR)
│       • /comunidad              (placeholder "pronto")
│       • /privacy, /terms
│       • /sofia                  (deshabilitado — folder `_sofia-disabled/`)
│
├── dashboard/
│   ├── layout.tsx     ← monta <Navbar /> del dashboard + children
│   │   • /dashboard, /dashboard/perfil, /dashboard/notas, …
│   │
│   └── referenciales/
│       └── layout.tsx ← requireAuth() + <ReferencialesNav /> anidado
│           • /dashboard/referenciales              (hub con 3 cards)
│           • /dashboard/referenciales/mapa
│           • /dashboard/referenciales/tabla        (gated por perfil profesional)
│           • /dashboard/referenciales/contribuciones
│
└── layout.tsx         ← root (fonts, providers, Footer global, Analytics condicional)
```

El layout anidado `dashboard/referenciales/layout.tsx` aplica `requireAuth()` una sola vez para toda la subárbol y monta la nav secundaria compartida. Ver [ADR-007](adr/ADR-007-referenciales-ux-redesign.md) para los detalles del redesign.

**Route group `(public)`**: los paréntesis son sintaxis del router que sirve para compartir un layout entre rutas sin alterar sus URLs. `src/app/(public)/notas/[slug]/page.tsx` sigue respondiendo en `/notas/[slug]`.

**Primitivo compartido**: `src/shared/components/layout/common/account-menu/` exporta `AccountMenu` (dropdown presentacional), `DeleteAccountDialog` (modal), y `useAccountActions` (hook de sesión + delete). Tanto `PublicHeader` como el navbar del dashboard lo consumen — un cambio en `useAccountActions` se refleja automáticamente en ambos lados.

**Rutas sin chrome** (no pertenecen a `(public)/` ni a `dashboard/`): `/auth/*` (flujo de OAuth), `/login` (redirect server-side a `/auth/login`).

Diseño completo y razones en [ADR-004](adr/ADR-004-public-route-group-and-shared-account-menu.md).

---

## Variables de entorno

```env
# Prisma + Supabase PostgreSQL (obligatorias)
DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...@pooler.supabase.com:5432/postgres"

# Neon PostgreSQL — referenciales read-only (obligatoria para /api/v1/*)
NEON_DATABASE_URL="postgresql://...@ep-xxx.aws.neon.tech/referenciales?sslmode=require"

# Supabase Auth (públicas — se inline en el bundle al build time)
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."

# Gemini AI — Sofia RAG chatbot (solo requerida cuando se reactive Sofia)
GEMINI_API_KEY="AIza..."

# Rate limiting (muy recomendado — si faltan, /api/v1/* y los endpoints
# mutantes del foro operan en fail-open sin límite)
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxx..."

# N8N login webhook (opcional — notifica cada login a un flow externo)
N8N_LOGIN_WEBHOOK_URL="https://<N8N_HOST>/webhook/..."

# Opcionales
NEXT_PUBLIC_BASE_URL="https://inmogrid.cl"
RESEND_API_KEY="re_..."
```

Tanto `DATABASE_URL` como `DIRECT_URL` son obligatorias para Prisma — si falta una, Prisma falla con `P1012`. `NEON_DATABASE_URL` es obligatoria para cualquier endpoint bajo `/api/v1/*` o `/api/referenciales/map-data`. `GEMINI_API_KEY` no es necesaria hoy (Sofia pausada) pero queda documentada para cuando se reactive.

### Vercel — Production vs Preview vs Development

Las env vars en Vercel se configuran **por environment** (Production, Preview, Development) de forma independiente. Si una var está solo en "Production", los Preview deployments de feature branches la tendrán vacía.

- Todas las `NEXT_PUBLIC_*` + `DATABASE_URL` + `DIRECT_URL` + `NEON_DATABASE_URL` + `GEMINI_API_KEY` deben estar marcadas para **Production y Preview** simultáneamente.
- El código de `useAuth` está diseñado para no crashear el build si falta una `NEXT_PUBLIC_SUPABASE_*` (ver patrón "SSR-safe hooks" en [`patrones.md`](arquitectura/patrones.md)), pero la auth en runtime sí requiere las vars.

### Migraciones de schema

Por policy del proyecto (ver `CLAUDE.md`), las migraciones Prisma se aplican **manualmente** en el SQL Editor de Supabase:

1. Editar `prisma/schema.prisma`
2. `npm run prisma:generate`
3. Generar el SQL equivalente y pegarlo en el SQL Editor

Los scripts SQL idempotentes listos-para-pegar viven en `scripts/sql/YYYY-MM-DD-descripcion.sql` — **whitelisted** en `.gitignore` para versionado. La carpeta hermana `scripts/migrations/` está **gitignored** (policy: nunca commitear pg_dump ni scripts con data real).

---

## Convenciones de contribución

Antes de abrir un PR, revisá:

- [ADR-001 — Feature-first architecture](adr/ADR-001-feature-first-architecture.md)
- [ADR-003 — Design tokens two-layer system](adr/ADR-003-design-tokens-two-layer-system.md)
- [ADR-008 — Role-based access](adr/ADR-008-role-based-access.md)
- [ADR-009 — Unified AppShell](adr/ADR-009-unified-app-shell.md) (supersede parte de ADR-004)
- [ADR-010 — Forum engagement](adr/ADR-010-forum-engagement.md)
- [Patrones de código](arquitectura/patrones.md)
- [Roadmap de refactor](arquitectura/ROADMAP-refactor.md)

**Reglas rápidas:**

- TypeScript `strict`, sin `any` implícitos
- Forms con React Hook Form + Zod
- Import alias: `@/` → `src/`
- Estilos con Tailwind usando **tokens semánticos** (`bg-primary`, `text-foreground`, `bg-accent/20`). **No usar** Tailwind raw como `text-blue-600` — ver [`design-system.md`](design-system.md) y [ADR-003](adr/ADR-003-design-tokens-two-layer-system.md)
- Nada de secretos en el repo — usar `.env.local`
