# Feature: `posts`

Gestión de publicaciones (notas/artículos) del ecosistema inmogrid.cl.

## Nota sobre la tabla `posts`

La tabla `posts` tiene columnas legacy que no coinciden con el Prisma schema actual. Por eso algunas queries usan `$queryRaw` / `$executeRaw` en lugar de los métodos tipados de Prisma.

## Scope

- Capa de datos para `posts` (queries Prisma tipadas)
- Validaciones Zod de entrada
- Utilidades de slug y tiempo de lectura
- **NO** incluye componentes UI — el feed público vive en `src/app/(public)/blog/` y el editor admin en `src/app/(public)/admin/blog/` (se migrarán a `features/posts/components/` en una iteración posterior cuando haya componentes desacoplados)

## Estructura

```
features/posts/
├── lib/
│   ├── queries.ts       # listPostsByUser, createPostForUser, updatePostForUser, ...
│   ├── validations.ts   # Zod schemas + SELECT projections
│   └── slug.ts          # generateSlug, estimateReadTime
└── index.ts             # API pública
```

## API pública

```ts
import {
  listPostsByUser,
  getPostByIdForUser,
  createPostForUser,
  updatePostForUser,
  deletePostForUser,
  createPostSchema,
  updatePostSchema,
  type CreatePostInput,
  type UpdatePostInput,
} from '@/features/posts';
```

## Dependencias permitidas

- Internas: `@/lib/prisma` (en Sprint 3 migrará a `@/shared/lib/prisma`)
- Externas: `zod`, `crypto` (node built-in)

## Consumido por

- `src/app/api/posts/route.ts` — `GET`, `POST /api/posts`
- `src/app/api/posts/[id]/route.ts` — `GET`, `PUT`, `DELETE /api/posts/[id]`

## Pendiente

- Extraer componentes del editor a `features/posts/components/` cuando se refactorice `src/app/(public)/admin/blog/nuevo/BlogPostForm.tsx`
- Añadir tests unitarios para `queries.ts` con mocks de Prisma
- Añadir endpoint público `GET /api/public/posts` aquí (actualmente no existe feed público)
