---
description: API route conventions for Next.js App Router
globs: ["src/app/api/**/*.ts"]
---

# API Conventions

## Route Structure
- `/api/v1/*` — public, Neon data (referenciales), CORS `*`, rate-limited if Upstash configured
- `/api/public/*` — public, Supabase data (posts, profiles, health, UF widget)
- `/api/*` (anything else) — auth required via `getUser()` from `@/shared/lib/supabase/auth`

## Standard Pattern
```typescript
import { getUser } from '@/shared/lib/supabase/auth'

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  // Zod validation → Prisma query → response
}
```

For admin-only routes use `getProfile()` + `isAdminRole(profile?.role)` (never compare role strings directly).

## Error Handling
- P2002 (unique violation) → 409 Conflict
- P2025 (not found) → 404 Not Found
- Zod validation failure → 400 Bad Request with `{ error, details: issues }`
- Always return JSON with `{ error: string }` shape for errors

## Security
- Never expose internal IDs or stack traces in error responses
- Validate all user input with Zod schemas
- No raw SQL against Supabase — use Prisma. Raw SQL against **Neon** is allowed (read-only, lives in `src/shared/lib/queries/referenciales.ts`)
- Chilean data: never return RUT or personal identifiers in public endpoints
- Apply PII masking (`features/referenciales/lib/mask.ts`) server-side for `comprador`/`vendedor` when role is not admin
- BigInt fields (`monto`) are returned as String — never `Number`
