# ADR-006: Sofia RAG Chatbot with Gemini AI

**Date**: 2026-04-13
**Status**: **Paused** (2026-04-24) — feature deshabilitado en UI, código conservado para reactivación
**Deciders**: equipo de inmogrid.cl

> ## ⏸️ Status: Paused (2026-04-24)
>
> Sofia fue **deshabilitada** mientras el equipo prioriza el foro como core del
> producto. La decisión de diseño, el stack técnico y el plan de implementación
> siguen siendo correctos — solo pausamos el rollout.
>
> **Estado del código** (post-cleanup del 2026-04-24):
>
> - Feature renombrado: `src/features/sofia/` → `src/features/sofia-chat/`
> - Rutas físicamente movidas a folders con prefix `_` (Next 15 los excluye
>   del file-based routing):
>   - `src/app/(public)/sofia/` → `src/app/(public)/_sofia-disabled/`
>   - `src/app/api/sofia/` → `src/app/api/_sofia-disabled/`
> - Dependencia legacy eliminada: `@ai-sdk/openai` y `ai` del package.json
>   (eran de `features/chat`, que también fue eliminado en el mismo cleanup —
>   ver sección "Contexto histórico" abajo).
> - Tablas Supabase **conservadas**: `sofia_documents`, `sofia_conversations`,
>   `sofia_messages`. Sin datos, pero listas para cuando se retome.
> - Variable de entorno `GEMINI_API_KEY` sigue documentada en CLAUDE.md.
>
> **Para reactivar**:
>
> 1. Renombrar en `app/`: `_sofia-disabled` → `sofia` (ambos folders).
> 2. Descomentar entrada en `src/shared/components/layout/public/LeftSidebar.tsx`,
>    `PublicHeader.tsx` y `src/app/sitemap.ts`.
> 3. Restaurar `'/api/sofia/'` en `src/middleware.ts` PUBLIC_PATHS.
> 4. Ejecutar Phase 4 (ver "Roadmap" abajo): sembrar `sofia_documents` con el
>    knowledge base curado.
> 5. Actualizar este ADR a Status: Accepted.

## Contexto histórico

(El documento se mantiene porque la decisión técnica sigue siendo la pauta a
seguir cuando se retome el feature. Las secciones abajo describen el diseño
**como fue aprobado** — no describen el estado actual del código.)

inmogrid.cl necesita un asistente conversacional sobre materia inmobiliaria chilena accesible desde `/sofia`. El feature `features/chat` existente era un FAQ bot sin búsqueda semántica — los usuarios querían respuestas más precisas sobre documentación técnica, normativa y metodología.

> **Nota 2026-04-24**: `features/chat` fue **eliminado completo** en el cleanup
> del 2026-04-24 (ADR tácito de deuda técnica, no ADR formal). Razón: duplicaba
> el propósito de Sofia con infra más cara (OpenAI pay-per-token vs. Gemini
> free tier) y sin RAG. Tabla `chat_messages` dropeada en la migration
> `20260424000000_drop_legacy_chat_messages`.

El objetivo: integrar un chatbot con RAG (Retrieval-Augmented Generation) completo sobre infraestructura enteramente gratuita, manteniendo el stack del resto del proyecto.

## Decision

### LLM: Gemini 2.5 Flash (Google AI, free tier)
- 500 requests/day free, <2s latency
- Excellent Spanish language quality for Chilean real estate domain
- No local fallback — if Google is down, Sofia shows "no disponible"

**Why not local (Qwen/Gemma)?** Modelos 8B en ARM toman 20–40 s por respuesta. UX inaceptable. Gemini Flash es 10× más rápido y mejor calidad en español.

### Embeddings: Gemini text-embedding-004 (768 dimensions)
- Free tier included with same API key
- Good Spanish quality for legal/real estate vocabulary
- 768 dimensions (vs 1536 for OpenAI) — smaller vectors, faster search

### Vector DB: Supabase pgvector
- Extension already available in the shared Supabase project
- HNSW index with cosine distance for fast similarity search
- Multi-threshold cascade search (ported from Sofia standalone)

### No Source Attribution
- Some knowledge base materials have copyright restrictions
- RAG improves answer quality but Sofia never cites specific documents
- This is a conscious design choice, not a limitation

## Architecture

```
/sofia (Next.js page, public)
  └── SofiaChatInterface (client component, streaming)
        └── POST /api/sofia/chat (SSE streaming)
              ├── Embed query → Gemini text-embedding-004
              ├── Vector search → Supabase pgvector (top 5 docs)
              ├── Build context (3000 chars, no citations)
              ├── Generate → Gemini 2.5 Flash (streaming)
              └── Save messages → Supabase

Tables:
  sofia_documents      → Knowledge base + vector(768) embeddings
  sofia_conversations  → Chat sessions (auth + anonymous)
  sofia_messages       → Message history
```

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Gemini client + RAG | Done | `shared/lib/gemini.ts`, Zod schemas, multi-threshold search |
| 2. API route (streaming) | Done | `api/sofia/chat/route.ts` with SSE |
| 3. Frontend UI | Done | Chat interface at `/sofia` with streaming display |
| 4. Knowledge base seeding | **Pending** | Needs working Gemini API quota + seed documents |
| 5. Prisma models + polish | Done | Schema, CSP headers, env config |

## Costs

| Component | Cost |
|-----------|------|
| Gemini 2.5 Flash + text-embedding-004 | $0/month |
| Supabase pgvector | $0 (existing plan) |
| Vercel hosting | $0 (existing plan) |

## Related

- `ADR-005` — Dual-backend architecture (Supabase + Neon)
