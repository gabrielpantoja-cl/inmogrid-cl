# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**inmogrid.cl** is a collaborative digital ecosystem for personal branding and professional networking in the Chilean real estate space — think Substack + Behance + Linktree. Users create profiles, publish posts, connect with professionals, and access real estate tools.

**Stack**: Next.js 15 (App Router) · React 19 · TypeScript · Prisma ORM · Supabase PostgreSQL · Supabase Auth (Google OAuth) · Tailwind CSS · Vercel

**Current Phase**: Phase 1 (User Profiles + Posts) — in progress

## Dual-Backend Architecture (ADR-005)

inmogrid.cl operates with **two backends**:

| Backend | Engine | Client | Purpose | Access |
|---------|--------|--------|---------|--------|
| **Supabase** | PostgreSQL | Prisma ORM | Profiles, posts, connections, events, chat, contributions | Read/Write |
| **Neon** | PostgreSQL + PostGIS | postgres.js (raw SQL) | Real estate transactions (`referenciales` ~85k+, growing) + CBR directory (`conservadores` 91 records) | **Read-only** |

**Key rules**:
- Neon queries are **read-only** — all SQL lives in `src/shared/lib/queries/referenciales.ts` (covers both `referenciales` and `conservadores` tables)
- **Schema changes come from the upstream ingestion pipeline, not from here**. The `referenciales` table is owned by a separate ingestion service repo; that service runs migrations (raw SQL against Neon) and notifies us. There is NO `Referencial` model in `prisma/schema.prisma` — Prisma only points at Supabase. `prisma migrate diff`/`resolve` do not apply against Neon either (Neon is not in the Prisma connection).
- **Always check Neon tables first** with `mcp__neon__get_database_tables` before assuming a table doesn't exist — Neon holds more than just `referenciales`
- `monto` (transaction amounts) are **always String** in API responses — never `Number` (BigInt precision)
- PostGIS coordinates use `ST_X(geom)`/`ST_Y(geom)` with fallback to `lat`/`lng` columns
- **Surface split is the source of truth (post 2026-04-29 cleanup)**: `superficieTerreno` / `superficieConstruida` + `destino` (1-letter SII code) son la fuente única. La columna legacy `superficie` quedó **deprecated**: nullable en Neon (era NOT NULL), eliminada en Supabase `contributions`, no expuesta en el JSON de `/api/v1/map-data` ni leída por el frontend. **~33.4%** de los registros pre-migración aún tienen los splits en NULL hasta que la ingesta upstream complete la cobertura. Consumers deben tratar ambos splits como opcionales. Ver `src/features/referenciales/lib/destino.ts` para el diccionario SII.
- User contributions go to Supabase staging (`contributions`) → admin review → pipeline to Neon (single source of truth for `referenciales`)
- Full decision record: `docs/adr/ADR-005-dual-backend-supabase-neon.md`

## Database Notes

- The `posts` table has legacy columns (`author_id`, `status`, `image`) that coexist with the Prisma schema columns (`user_id`, `published`, `cover_image_url`). The `/api/public/posts` route uses `$queryRaw` against the legacy columns; `features/posts/lib/queries.ts` uses Prisma against the new columns. Both sets of columns are populated via a one-time migration (run 2026-04-19).
- Schema migrations: run SQL manually in the Supabase dashboard (no `prisma migrate`, no `db pull`). Workflow: edit `prisma/schema.prisma` → `prisma:generate` → write idempotent SQL in `scripts/sql/YYYY-MM-DD-<description>.sql` (committable) → paste into the Supabase SQL Editor. **Historical warning**: twice models were added to Prisma (forum 2026-04-21, contributions 2026-04-26) without running the SQL in production → the API responded 500 with `type "X" does not exist` or `relation "Y" does not exist`. Before merging schema changes, verify that the corresponding `scripts/sql/` file exists and has been applied.

## Development Commands

```bash
npm run dev              # Next.js with Turbo
npm run build            # Runs prisma generate + next build
npm run lint             # ESLint

# Database
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:push      # Apply schema to DB (uses .env.local)
npm run prisma:studio    # Prisma Studio UI
npm run prisma:reset     # generate + push

# Seed
npm run seed             # prisma/seed.mjs

# Tests
npm run test             # Jest
npm run test:watch       # Jest watch
npm run test:api         # API tests
npm run test:public-api  # Public API tests only
npm run test:e2e         # Playwright E2E

# API smoke tests
npm run api:health       # GET /api/public/health
npm run api:config       # GET /api/public/map-config

# Cleanup
npm run clean            # rm -rf .next
npm run clean:full       # rm -rf .next + node_modules
```

> **Database migrations**: run SQL manually in the Supabase dashboard. No `prisma migrate`, no `db pull`. Workflow: edit `prisma/schema.prisma` → `prisma:generate` → paste SQL in Supabase SQL editor.

> ✅ **Production migrations applied (2026-04-29)**: tanto `scripts/sql/2026-04-29-contribution-split-fields.sql` como `scripts/sql/2026-04-29-supabase-contributions-superficie-cleanup.sql` se aplicaron en Supabase via MCP. La tabla `contributions` ahora tiene las 4 columnas split y la columna `superficie` legacy fue eliminada (verificado: solo había 1 aporte y sin valor en superficie).

## Auth Architecture

**Provider**: Supabase Auth (Google OAuth only). NextAuth has been fully removed.

```
src/lib/supabase/
  client.ts     → createClient() for browser components
  server.ts     → createClient() for server components / API routes
  middleware.ts → updateSession() — refreshes session on every request
  auth.ts       → getUser(), getProfile(), requireAuth() helpers
src/lib/auth.ts       → auth() — thin server wrapper around getUser()
src/lib/auth-utils.ts → robustSignOut() for client components
src/hooks/useAuth.ts  → useAuth() hook (isAuthenticated, user, profile, signOut)
```

**Server components / API routes** — soft check:
```typescript
import { getUser } from '@/lib/supabase/auth'
const user = await getUser()              // null if not logged in
const profile = await getProfile(user.id) // inmogrid_profiles row
```

**Server components / API routes** — hard check (redirects):
```typescript
import { requireAuth } from '@/lib/supabase/auth'
const user = await requireAuth()          // throws/redirects if unauthenticated
```

**Server components / API routes — admin-only**:
```typescript
import { requireAdmin, getProfile, isAdminRole } from '@/shared/lib/supabase/auth'

// Server component / page.tsx — redirects to /dashboard?error=admin_required
const { user, profile } = await requireAdmin()

// Route handler — return 403 instead of redirect
const authUser = await auth()
if (!authUser?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
const profile = await getProfile(authUser.id)
if (!isAdminRole(profile?.role)) {
  return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 })
}
```

**Server components — premium routes (require professional profile)**:
```typescript
import { requireProfessionalProfile } from '@/shared/lib/supabase/auth'
const { user, profile } = await requireProfessionalProfile()
// Redirects to /dashboard/perfil?complete=professional if `profession` is missing.
// Currently used by /dashboard/referenciales/tabla.
```

Profile-based gating (profession or role) lives in server components because middleware runs in **edge runtime** and cannot access Prisma. Do not try to move these checks there.

### Role matrix

| Role | Forum (open threads and comment) | Blog (publish / edit / delete) | Referenciales table view |
|---|:---:|:---:|:---:|
| unauthenticated | ❌ | ❌ | ❌ |
| `user` | ✅ | ❌ | Requires `profession` set |
| `admin` | ✅ | ✅ | ✅ |
| `superadmin` | ✅ | ✅ | ✅ |

`isAdminRole(role)` normalizes the check — `admin` and `superadmin` are both admin. **Always use the helper**, do not compare bare strings.

### Escalating to admin (manual from Supabase SQL Editor)

Roles are set outside the normal auth flow — the maintainer administers them directly in the database:

```sql
-- Example (replace the email with the user to escalate)
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'ejemplo@dominio.cl');
```

To revert: `UPDATE profiles SET role = 'user' WHERE ...`. Posts previously published by an ex-admin remain published but the `user` loses edit/delete on them (the `/api/posts/[id]` handlers check `isAdminRole` before touching the row).

**Client components**:
```typescript
import { useAuth } from '@/hooks/useAuth'
const { user, profile, isLoading, isAuthenticated, isAdmin } = useAuth()
```

**Auth flow**: `/auth/login` → Supabase OAuth → Google → `/auth/callback` → creates Profile row in `inmogrid_profiles` → redirect to `/dashboard`.

## Data Model

The primary user model is **Profile** (not User). `Profile.id` is a UUID matching `auth.users.id` in Supabase.

```
Profile              → profiles table
Post                 → posts table              (has legacy columns outside Prisma schema)
Connection           → connections table
Event                → events table
ProfessionalProfile  → professional_profiles table
AuditLog             → audit_logs table
ChatMessage          → chat_messages table
ForumThread          → threads table
ForumComment         → comments table
Contribution         → contributions table
SofiaDocument        → sofia_documents table
SofiaConversation    → sofia_conversations table
SofiaMessage         → sofia_messages table
InmogridBadge        → badges table
InmogridUserBadge    → user_badges table
InmogridPointsLedger → points_ledger table
```

**Critical field mappings** (Prisma camelCase → DB snake_case):
- `fullName` → `full_name`
- `avatarUrl` → `avatar_url`
- `isPublicProfile` → `is_public_profile`
- `coverImageUrl` → `cover_image_url`
- `userId` → `user_id`

**Connection relations** use field names `requester` and `receiver` (NOT long Prisma-generated names like `Connection_requesterIdToProfile`).

**Role enum**: `user | admin | superadmin` — stored in `Profile.role`, not in Supabase Auth.

**ProfessionType enum**: `TASADOR_PERITO | PERITO_JUDICIAL | CORREDOR_PROPIEDADES | ADMINISTRADOR_PROP | ABOGADO_INMOBILIARIO | ARQUITECTO | INGENIERO_CIVIL | ACADEMICO | FUNCIONARIO_PUBLICO | INVERSIONISTA | PROPIETARIO | OTRO`

## Referenciales UX (2026-04-20)

The `referenciales` experience is split across five routes:

```
/referenciales                               → public — map + stats (no table)
/dashboard/referenciales                     → hub with 3 cards (requireAuth)
/dashboard/referenciales/mapa                → map in authenticated mode + advanced filters
/dashboard/referenciales/tabla               → spreadsheet-style table (requireProfessionalProfile)
/dashboard/referenciales/contribuciones      → user's submission history
```

**Map (`features/referenciales/components/ReferencialesMap.tsx`)**:
- Clustering with `supercluster` (not `leaflet.markercluster` — discarded as redundant).
- Markers and clusters rendered as `L.divIcon` with custom HTML/CSS (`map-markers.css`). Semi-transparent halo and cluster with animated concentric rings (`prefers-reduced-motion` respected).
- **Custom spiderfy**: clicking a small cluster (≤10 points) that can no longer be split by zoom, the leaves spread out in a circle around the anchor with dotted lines. Collapses on move / zoom / outside click.
- **Geocoder**: `leaflet-geosearch` + `OpenStreetMapProvider` (Nominatim, free, no key). Restricted to `countrycodes: 'cl'`. Decision: _no_ Mapbox — see "When to migrate to Mapbox" below.

**Table (`app/dashboard/referenciales/tabla/`)**:
- `@tanstack/react-table` + shadcn-style `table.tsx` and `popover.tsx` in `src/shared/components/ui/primitives/`.
- **URL as source of truth**: filters (`q`, `comuna`, `anio`, `fechaDesde`, `fechaHasta`, `montoMin/Max`, `superficieTerrenoMin/Max`, `superficieConstruidaMin/Max`, `page`) live in `searchParams`. The server action `fetchReferencialesTable` runs on every change.
- Fixed pagination at 30 items/page (constant `PAGE_SIZE` in `actions.ts`), `offset` computed server-side.
- **Smart truncation**: `TruncatedCell` — any string >45 chars shows `…` + a `⤢` button that opens a Radix popover with the full value (closes on click-outside and Escape).
- **Gating**: `requireProfessionalProfile()` in `page.tsx` — redirects to `/dashboard/perfil?complete=professional` if `profession` is missing.

**PII masking (`features/referenciales/lib/mask.ts`)**:
- `maskName(value)` — "Juan Pérez" → "J**n P***z" (first and last letters revealed, dynamic asterisks).
- `maskObservaciones(value)` — regex matching 2+ consecutive capitalized words; address prefix whitelist (Avenida, Calle, Fundo…) to reduce false positives.
- Applied **server-side** in `fetchReferencialesTable` before responding — `admin`/`superadmin` see original values; `user` receives values already masked in the JSON.
- Backed by the `includePII` flag in `queryMapDataExtended`: if `false`, `comprador` and `vendedor` are not even selected in the SELECT (zero risk of leak via wrong endpoint).

**Suspicious data heuristic (`features/referenciales/lib/flags.ts`)**:
- `detectSuspicious(row)` returns `{ flags, level }`. Flags: `monto_zero`, `superficie_terreno_alta` / `superficie_construida_alta` / `superficie_construida_baja` (thresholds **per `destino`** — see table below), `fecha_invalid`, `rol_invalid`.
- **Derived, not persisted** — the `referenciales` table on Neon is read-only.
- UI: `SuspicionBadge` with level (low=yellow / medium=orange / high=red) + popover listing problems + "Report as dubious data" button that opens the existing `ReportModal`.
- Per-destino thresholds (m²): H 10.000/2.000 (terreno/construida), W 1M, A/B 50M, F 10M, C 5.000 (construida), I 50.000, Z/L/O 5..1.000. Records with known destino but NULL split do **not** get flagged (missing data ≠ suspicious). Records without `destino` no se flagean por superficie — esperan datos de la ingesta upstream.

**Surface split schema (Neon migration 2026-04-29)**:
- The `referenciales` table on Neon added 4 nullable columns: `superficieTerreno`, `superficieConstruida`, `destino` (1-letter SII code), `montoUf`. Migration applied by the upstream ingestion pipeline — inmogrid only syncs the read contract (commit `79bfd901`).
- **Sample test confirmed by destino**: H/C/I bring both surfaces; W (raw lot) and A (agricultural) bring only `superficieTerreno`; Z/L/O (parking, storage, office in horizontal property) bring only `superficieConstruida` — land is alicuota of the common lot. Implementation respects NULL correctly via spread conditionals (`...(value != null && { key: value })`) — absent fields do not appear in the JSON.
- **Helper `destinoLabel(code)`** in `src/features/referenciales/lib/destino.ts` — maps SII code to a human label (H→Habitacional, W→Terreno (Sitio Eriazo), C→Comercial, etc.).
- **Helper `getSuperficieRelevante(r)`** in `src/features/referenciales/lib/superficie.ts` — selects the correct surface field based on `destino`. Returns `{ valor, fuente, confianza }` con `fuente: 'terreno' | 'construida' | null`. Si no hay split disponible (~34% pre-migración), devuelve `valor: null` (los consumidores muestran "—"). Usado por `ReportModal` y cualquier consumer que necesite un único número semánticamente correcto.
- **Helper `valorUnitario(r)`** — computes UF/m² (and CLP/m²) using the right surface and dimension; returns `null` cuando no hay split disponible (no calculamos sobre semántica ambigua).
- **Phase 2 status (DONE — commits `98f83e97`…`da97260e`)**:
  - Map tooltip prefers split with fallback to legacy.
  - Table shows `Sup. legacy` + `Terreno` + `Construida` + `Destino` + `Monto UF` side by side; filters now go directly against `superficieTerreno*` / `superficieConstruida*` (split-only — records without destino are excluded; UI shows ≈66% coverage disclaimer).
  - Stats display avg terreno + avg construida separately, each with its `n=` counter, plus a "Cobertura split" tile.
  - Map explorer (public + auth) filters migrated to split client-side.
  - `detectSuspicious` switched to per-destino thresholds (see above).
  - `ReportModal` displays the surface from `getSuperficieRelevante` with explicit label (terreno / construida / legacy).
  - `/api/v1/map-config` marks `superficie` field with `deprecated: true` in both popupFields and dataSchema.
- **Phase 3 status (DONE — commits `231fa1ee`…`8621a107`)**:
  - `Contribution` model en `prisma/schema.prisma` extendido con los 4 split fields. SQL `scripts/sql/2026-04-29-contribution-split-fields.sql` aplicado en Supabase (idempotente `ADD COLUMN IF NOT EXISTS`).
  - `_ContributeModal.tsx` y `BulkContribuirClient.tsx` exponen Destino, Sup. terreno, Sup. construida, Monto UF como inputs/columnas separadas.
  - `ContributionInputSchema` (Zod) valida los 4 campos; `destino` restringido a los 19 códigos SII vía `z.enum`. La columna legacy `superficie` se eliminó del schema y de los endpoints contribute (single + bulk).
- **Phase 4 status (DONE — commits `e44b9b81`…`10f7aacd`) — frontend cleanup legacy**:
  - Mapa popup, tabla, CSV export, flag `superficie_legacy_alta`, ContribuirClient bulk, schemas Zod, `MapPointRowSchema`/`MapPointResponseSchema`/`MapDataExtendedQueryParamsSchema`, queries de Neon (`SELECT` + filtros `superficieMin/Max`), endpoints `/api/v1/map-config` y `/api/referenciales/map-data`, type `Referencial`, `TableRow`, helper `getSuperficieRelevante` (sin branch `legacy`), `ReportModal`: todos limpios. El campo `superficie` ya no existe en ningún path del frontend.
- **Phase 5 status (DB cleanup — parcial)**:
  - Neon: snapshot de respaldo de los valores legacy creado antes de relajar la columna. `ALTER COLUMN superficie DROP NOT NULL` aplicado; columna marcada `DEPRECATED 2026-04-29`. **El DROP COLUMN definitivo sigue pendiente** — bloqueado hasta que la ingesta upstream alcance >=95% de cobertura split.
  - Supabase `contributions`: `DROP COLUMN superficie` aplicado. `prisma/schema.prisma` actualizado.
  - El detalle operativo de la ingesta upstream y el plan de cobertura viven fuera de este repo (`infra/privado/`).

**When to migrate to Mapbox** (decision postponed):
- If search traffic exceeds Nominatim's limit (1 req/sec per IP) — realistic only with aggressive autocomplete firing on every keystroke, which is NOT the current pattern.
- If better precision in Chilean rural areas is needed (Nominatim is decent in urban, weak in rural).
- If we want autocomplete-as-you-type with low latency.
- Migration: the same `leaflet-geosearch` ships `MapboxProvider` — swap only the provider instance and add `NEXT_PUBLIC_MAPBOX_TOKEN` restricted by domain.

## API Structure

```
/api/v1/                  → Public (Neon data, rate-limited, CORS *)
  map-data/               → GET referenciales with ?comuna=&anio=&limit=
  map-data/comunas/       → GET available comunas with counts
  map-config/             → GET map configuration (static)
  health/                 → GET dual-backend health (Supabase + Neon)
  docs/                   → GET API documentation (JSON)

/api/public/              → Public (Supabase data, no auth)
  health/                 → System health (Supabase only)
  posts/                  → Published posts feed
  profiles/[username]/    → Public profile by username

/api/                     → Auth required (middleware enforces)
  users/profile           → GET/PUT current user's profile
  posts/                  → GET/POST user's posts
  posts/[id]/             → GET/PUT/DELETE single post
  chat/                   → Sofia AI chat (legacy, OpenAI)
  sofia/chat/             → Sofia RAG chat (Gemini, SSE streaming)
  delete-account/         → Account deletion
  revalidate/             → Next.js cache revalidation
  referenciales/
    contribute/           → POST new contribution (auth)
    my-contributions/     → GET user's contributions (auth)
    contributions/        → GET all contributions (admin)
    contributions/[id]/review → PATCH approve/reject (admin)
```

**Standard API pattern**:
```typescript
export async function GET(request: NextRequest) {
  const authUser = await auth()   // or getUser() from '@/lib/supabase/auth'
  if (!authUser?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Validate input with Zod
  // Handle Prisma errors: P2002 → 409, P2025 → 404
}
```

## Route Protection

```typescript
// src/middleware.ts
PUBLIC_PATHS   = ['/auth/', '/api/auth/', '/api/public/', '/_next/', ...]
PROTECTED_PATHS = ['/dashboard']
// updateSession() runs on every request to refresh Supabase session cookies
```

## Environment Variables

```env
# Prisma / Supabase PostgreSQL (required)
DATABASE_URL="postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...@pooler.supabase.com:5432/postgres"

# Neon PostgreSQL — referenciales read-only (required for /api/v1/)
NEON_DATABASE_URL="postgresql://...@ep-xxx.aws.neon.tech/referenciales?sslmode=require"

# Supabase Auth (public — safe in browser)
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."

# Rate limiting (optional — disabled if not set)
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxx..."

# Gemini AI — Sofia RAG chatbot (required for /sofia and /api/sofia/)
GEMINI_API_KEY="AIza..."

# Optional
NEXT_PUBLIC_BASE_URL="https://inmogrid.cl"
OPENAI_API_KEY="..."                # Legacy chat (/api/chat) — will be removed
RESEND_API_KEY="..."
```

Both `DATABASE_URL` and `DIRECT_URL` are required for Prisma. `NEON_DATABASE_URL` is required for the `/api/v1/` referenciales endpoints. `GEMINI_API_KEY` is required for the Sofia RAG chatbot. All must be set in Vercel environment variables for production.

## Infrastructure

- **Production**: Vercel (auto-deploy on push to `main`)
- **DNS**: Cloudflare (proxy OFF) — see `Codex.local.md` for specific records
- **Supabase project**: see `Codex.local.md`
- **Neon project**: see `Codex.local.md`
- **N8N**: separate VPS service (URL in `Codex.local.md`)

## Sofia RAG Chatbot ([ADR-006](docs/adr/ADR-006-sofia-rag-gemini-integration.md))

Public page at `/sofia`. RAG-powered assistant for Chilean real estate.

- **LLM**: Gemini 2.5 Flash (free tier, 500 req/day)
- **Embeddings**: Gemini text-embedding-004 (768 dim, free)
- **Vector DB**: Supabase pgvector with HNSW index
- **Streaming**: SSE via `POST /api/sofia/chat`
- **Auth**: Optional (anonymous via localStorage sessionId + authenticated via Supabase)
- **No source attribution** — RAG improves answers but never cites documents (copyright)
- **Status**: UI + API + DB ready. Knowledge base seeding pending (Phase 4).
- **Env var**: `GEMINI_API_KEY` (from https://aistudio.google.com/apikey)

Key files:
- `src/shared/lib/gemini.ts` — Gemini API client (embeddings + streaming chat)
- `src/features/sofia/lib/rag.ts` — RAG pipeline (multi-threshold vector search)
- `src/features/sofia/lib/persistence.ts` — Conversation storage
- `src/app/api/sofia/chat/route.ts` — SSE streaming endpoint

## Specialized Agents (`.Codex/agents/`)

There are **5 specialized agents**, each with trigger-oriented descriptions and explicit handoff rules. The orchestrator role is filled by the main session — there is no separate `inmogrid-orchestrator` agent. There is also no `api-developer` agent: API routes are owned by whichever specialist owns the data/UI it serves.

| Agent | Owns | Triggers (keywords / paths) |
|---|---|---|
| `database-manager` | `prisma/schema.prisma`, `scripts/sql/`, `src/shared/lib/queries/referenciales.ts`, RLS policies, query plans | "schema", "migration", "Prisma", "RLS", "PostGIS", "slow query", edits in `prisma/` or `scripts/sql/` |
| `data-ingestion` | Contributions pipeline validation, ROL/fojas/coordinate/monto rules, PII masking, CSV bulk, Zod schemas in `src/shared/lib/schemas/contribution*.ts`, helpers in `src/features/referenciales/lib/` | "CBR", "ROL", "fojas", "carga masiva", "contributions" (data layer), edits in `src/features/referenciales/lib/` or `src/app/api/referenciales/contribute/*` |
| `frontend-engineer` | Everything UI — pages, components, hooks, the rendering side of referenciales (map, table, contribute form) | "UI", "componente", "página", "Tailwind", "shadcn", "hydration", "formulario", edits in `src/app/`, `src/features/*/components/`, `src/shared/components/` |
| `infrastructure` | Vercel config, env vars, Cloudflare DNS, Supabase project settings, Neon project settings, n8n/VPS, `vercel.json`, `next.config.js` | "deploy" (config), "env var", "DNS", "Cloudflare", "VPS", "n8n", "Vercel config", "Supabase project" |
| `security-auditor` | Read-only — audits work the others produce | "security", "auditoría", "vulnerabilidad", "PII", "Ley 19.628"; auto-invoked after schema/route/auth changes, before merge |

### Routing & handoff matrix

The agents are designed to chain. Common workflows:

| Scenario | Sequence |
|---|---|
| New table with user-facing form | `database-manager` (schema + SQL + RLS) → `data-ingestion` (Zod + validation) → `frontend-engineer` (form UI) → `security-auditor` (RLS + masking + auth gates) |
| New public API endpoint | `database-manager` (query) → `data-ingestion` (PII mask if applicable) → `frontend-engineer` (route handler with auth gate) → `security-auditor` (gate + CORS + rate-limit) |
| Slow query report | `database-manager` (own end-to-end with EXPLAIN) |
| Adding `comprador`/`vendedor` to a new endpoint | `data-ingestion` (apply `mask.ts` server-side) → `security-auditor` (verify mask hits before role check) |
| New env var (e.g. third-party API key) | Originating agent identifies need → `infrastructure` (Vercel + docs) → `security-auditor` (verify no `NEXT_PUBLIC_` leak) |
| Pre-merge sweep | `security-auditor` last, always |

`security-auditor` is the terminal step in most chains — its GO/NO-GO verdict gates merge. The other 4 agents must hand off to it whenever they touch RLS, route handlers, PII, or env vars. They do not skip ahead.

## Chilean Domain Knowledge

- **ROL**: property identifier, format `/^\d{5}-\d{4}$/`
- **CBR**: Conservador de Bienes Raíces (property registry)
- **Tasación**: appraisal; **Peritaje**: judicial expert appraisal
- Geographic bounds: lat -56.0 to -17.5, lng -76.0 to -66.0
- 346 communes, 16 regions
