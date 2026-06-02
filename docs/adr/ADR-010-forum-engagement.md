# ADR-010: Forum Engagement — likes, bookmarks, share e inline comment

**Date**: 2026-04-21
**Status**: Accepted
**Deciders**: equipo de inmogrid.cl

## Context

Tras lanzar el foro (commit `6db60bd0`), los hilos aparecían en el feed con información mínima — autor, título, preview y contador de comentarios. Para comentar había que abrir el detalle, lo que rompía el flow de lectura rápida.

Los patrones que la comunidad espera hoy (Reddit, Twitter, Discourse) son:

1. **Like** para señal rápida de aprobación sin escribir.
2. **Bookmark/Guardar** para volver después sin depender de historial.
3. **Share** para distribuir el hilo fuera de la plataforma.
4. **Comentar inline** sin abandonar el feed.
5. **Preview expandible** con "…más" cuando el contenido es largo.

Implementarlos requiere decisiones sobre schema, optimistic UI y la frontera entre feed y detalle.

## Decision

### 1. Schema — tablas join con composite PK

Para likes y bookmarks, una tabla join por relación con PK compuesta `(user_id, thread_id)`:

```prisma
model ForumThreadLike {
  userId    String      @db.Uuid @map("user_id")
  threadId  String      @map("thread_id")
  createdAt DateTime    @default(now()) @map("created_at")
  user      Profile     @relation(fields: [userId], references: [id], onDelete: Cascade)
  thread    ForumThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  @@id([userId, threadId])
  @@index([threadId])
  @@map("thread_likes")
}
```

**Por qué composite PK y no `id` surrogate + unique constraint**: el composite PK garantiza unicidad a nivel almacenamiento, sin columna `id` extra que no se usa nunca (nadie query por `WHERE id = ?`; siempre es `WHERE userId = ? AND threadId = ?`). Una fila de `thread_likes` pesa 16 + 25 + 8 bytes en vez de 25 + 16 + 25 + 8 — para una tabla que puede crecer a miles de filas por día, importa.

**Bookmarks sin contador global**: son personales. No hay público interesado en "cuántos guardaron este hilo". Solo el dueño necesita saber si lo guardó él.

### 2. Contador denormalizado con transacción

`ForumThread.likeCount` mantiene el conteo actual. Se actualiza **dentro** de la transacción que crea/borra la fila de `thread_likes`:

```ts
return prisma.$transaction(async (tx) => {
  if (existing) {
    await tx.forumThreadLike.delete({ where: { userId_threadId: { ... } } })
    const updated = await tx.forumThread.update({
      where: { id: threadId },
      data: { likeCount: { decrement: 1 } },
      select: { likeCount: true },
    })
    return { liked: false, likeCount: Math.max(0, updated.likeCount) }
  }
  // ... increment branch
})
```

**Por qué denormalizar**: el feed muestra `likeCount` de cada thread. Calcularlo con `COUNT(*)` en cada request escala mal — con 1000 threads en el feed, sería 1000 subqueries. El counter denormalizado lo transforma en un `SELECT likeCount FROM threads`, gratis.

**Por qué transacción**: si el INSERT del like y el UPDATE del counter no van en la misma transacción, una falla entre los dos deja el counter desincronizado para siempre.

### 3. Viewer flags en el mismo fetch

El endpoint `GET /api/public/threads` detecta sesión vía cookies y, si hay, decora cada hilo con `liked` y `bookmarked`:

```ts
const viewer = await auth()
const threads = await listThreads({ ..., viewerId: viewer?.id })
```

Internamente, `listThreads` hace **dos queries adicionales** (una para likes, una para bookmarks) que traen solo los IDs de los threads del batch. Con los IDs se arma un `Set<string>` en memoria y se decora cada thread. Dos queries por request, no N+1.

**Por qué no un endpoint separado `/api/threads/viewer-state`**: eso obligaría al cliente a hacer 2 round-trips. El endpoint ya es `dynamic` (no cacheable), así que no hay penalty por incluir datos específicos del viewer.

### 4. Optimistic UI con rollback

Los toggles (like, bookmark) responden **inmediato** en la UI. Si el fetch falla, el state revierte:

```tsx
const handleLike = async () => {
  if (!isAuthenticated) { void signIn(); return }
  const prevLiked = liked
  const prevCount = likeCount
  setLiked(!prevLiked)                               // ← Optimistic
  setLikeCount(prevCount + (prevLiked ? -1 : 1))
  try {
    const res = await fetch(`/api/threads/${id}/like`, { method: 'POST' })
    if (!res.ok) throw new Error('fail')
    const data = await res.json()
    setLiked(data.liked)                             // ← Reconcile con server
    setLikeCount(data.likeCount)
  } catch {
    setLiked(prevLiked)                              // ← Rollback
    setLikeCount(prevCount)
  }
}
```

La UX se siente instantánea incluso con 500ms de red, y sigue siendo correcta si el server rechaza (403 por no-auth, 404 por thread borrado, etc.).

### 5. Comentar inline — composer expandible

El botón "Comentar" de la card expande un `RichTextEditor` **dentro de la misma card**, no navega al detalle. Al publicar, se cierra el composer y `router.refresh()` refresca el feed para mostrar el nuevo `commentCount`.

**Por qué no un modal**: el modal tapa el contexto. Expandir inline deja visible el hilo que se está comentando, más el resto del feed como referencia.

**Por qué no un slide-out panel**: misma razón que el modal — corta el contexto. Inline composer es la opción de menor fricción para el usuario.

**Comportamiento no-autenticado**: click en cualquier botón (like, comentar, guardar) dispara Google OAuth directamente en vez de mostrar un prompt. Es el patrón Reddit/Twitter y reduce fricción a un tap.

### 6. Preview expandible con "…más"

Si `preview.length > 220` chars, se muestra con `line-clamp-3` + botón "…más" que expande. Botón "menos" para colapsar. Evita que el usuario pague el costo de un page load solo para leer dos párrafos extra.

### 7. Share con fallback

Usa `navigator.share` cuando está disponible (móvil), fallback a `navigator.clipboard.writeText` con feedback "¡Copiado!" de 1.8s. Si clipboard también falla (navegadores raros), abre el link en ventana nueva para copy manual.

### 8. Estructura del componente — una sola card client

`ThreadCard` se convirtió en un client component (`'use client'`). Antes envolvía todo en un `<Link>` al detalle. Ahora:

- **Título y preview** son el único link al detalle.
- **Barra de acciones** es interactiva (no navega).
- **Estado local**: `liked`, `likeCount`, `bookmarked`, `expanded`, `composerOpen`, `shareState`.

Trade-off asumido: ya no se puede pre-renderizar esta card 100% server. A cambio, cada thread puede responder a interacciones sin ruteo.

## Consequences

### Positive

- Feed se vuelve el "home" natural — el detalle queda para leer comentarios largos o anclar una URL.
- PK compuesta es idempotente a nivel DB — sin duplicados incluso si dos requests concurrentes intentan like.
- Counter denormalizado + transacción = feed rápido y consistente.
- Optimistic UI hace la app sentirse snappy incluso en redes lentas.
- Click sin sesión → Google OAuth directo: conversion frictionless.

### Negative

- `ThreadCard` client-side aumenta el JS bundle del feed (~300 líneas de componente + deps de Tiptap cargadas on-demand cuando se abre el composer).
- `likeCount` puede desalinearse si alguien hace INSERT/DELETE directo en `thread_likes` fuera de la transacción (p. ej. desde el SQL Editor). Mitigación: si pasa, un `UPDATE threads SET like_count = (SELECT COUNT(*) FROM thread_likes WHERE thread_id = id)` lo reconcilia.
- `listThreads` con `viewerId` hace 3 queries en vez de 1. Escalable hasta mucho más que el tráfico actual; si llega a ser hotpath, se puede collapsar en una sola query con LEFT JOIN.

### Risks

- **Counter drift**: si la transacción de like falla a mitad (conexión cortada entre el DELETE y el UPDATE), el counter queda desalineado. Prisma re-lanza en caso de connection error, lo que ayuda. Si se detecta drift en prod, reconciliar con el SQL de arriba.
- **Bundle bloat**: `RichTextEditor` (Tiptap) es pesado. Solo se carga cuando el composer se abre — usar `next/dynamic` con `ssr: false` si se mide que el TTI se degrada.

## Alternatives Considered

### A. Sin denormalizar el counter

Un `COUNT(*)` por thread en cada render del feed. Descartado por el costo.

### B. Server actions en vez de route handlers

`toggleLike`, `toggleBookmark` como server actions invocadas desde el client component. Funciona, pero el flujo actual con `fetch('/api/...', { method: 'POST' })` es más fácil de testear y monitorear en Vercel logs. Se puede migrar si se quiere reducir bundle del cliente.

### C. Likes como tabla separada de bookmarks con FK a un `engagements` común

Over-engineering. Likes y bookmarks tienen shapes idénticas pero políticas distintas (hay contador global solo en likes). Dos tablas paralelas es más simple que una tabla con `type` + polymorphism.

## Related Documents

- `ADR-004` — route group `(public)` + `AccountMenu` compartido (donde se originó el foro).
- `ADR-009` — AppShell unificado (contenedor del feed).
- `scripts/sql/2026-04-21-forum-likes-bookmarks.sql` — migración aplicable en Supabase.
- `src/features/forum/lib/queries.ts` — `toggleThreadLike`, `toggleThreadBookmark`, `listThreads` extendido.
- `src/shared/components/forum/ThreadCard.tsx` — implementación UI.
- `docs/arquitectura/patrones.md` sección "Optimistic UI con rollback" — patrón generalizable.
