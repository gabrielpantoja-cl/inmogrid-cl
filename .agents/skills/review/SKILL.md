---
name: review
description: Review the current branch changes for code quality, security, and Chilean data compliance. Invoke before merging a PR or when the user asks to "revisar", "review", or "auditar" the work in progress.
---

# Branch Review

Review the current changes in this branch for code quality, security, and correctness — focused on the inmogrid.cl conventions.

## Steps

1. Run `git diff main...HEAD --stat` to see scope of changes; then `git diff main...HEAD` for full content if scope is small enough.
2. For each changed file, check:
   - **TypeScript strict**: no `any`, no `as` casting without justification, no `// @ts-ignore`/`@ts-expect-error` without comment.
   - **Prisma**: field names use camelCase (matching `prisma/schema.prisma` `@map` mappings); BigInt fields (`monto`) returned as String, never Number.
   - **API routes**: standard pattern (auth check via `getUser()`/`auth()` first, Zod validation, Prisma error handling: P2002→409, P2025→404).
   - **No secrets**: search for hardcoded API keys, tokens, `Bearer ` strings, `PGPASSWORD`, `client_secret`, `sk-live`, `AIzaSy`.
   - **No risky patterns**: `dangerouslySetInnerHTML` outside the sanitized forum render path; `eval(`, `new Function(`; raw SQL string concatenation against Supabase.
   - **Auth patterns**: `getUser()`/`requireAuth()`/`requireAdmin()`/`requireProfessionalProfile()` from `@/shared/lib/supabase/auth` — not ad-hoc string comparisons of `profile.role`.
3. **Chilean data compliance (Ley 19.628)**:
   - No RUT exposure in any public endpoint response.
   - PII masking (`features/referenciales/lib/mask.ts`) applied to `comprador`/`vendedor` for non-admin readers.
4. **Build sanity**: confirm `npm run build` would pass — flag any obvious type drift between Prisma client and call sites.
5. **DB migrations**: if `prisma/schema.prisma` changed, verify the matching SQL exists in `scripts/sql/YYYY-MM-DD-*.sql`. If not, flag as blocker — see AGENTS.md "Database Notes" for why.

## Output

Report findings as a checklist with severity (CRITICAL / WARNING / NIT). Don't pad with style preferences. End with a **GO / NO-GO for merge** verdict and a 1-sentence summary.

If you find a CRITICAL issue, stop and surface it before continuing the review.
