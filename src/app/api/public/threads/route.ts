// GET /api/public/threads
// Lista pública paginada de hilos del foro. Soporta búsqueda (?q=) y
// filtro por tag. Sin auth requerida, pero si hay sesión activa (cookies)
// detecta el viewer y decora cada hilo con `liked` y `bookmarked` del
// usuario — evita un round-trip adicional para la UI.

import { NextRequest, NextResponse } from 'next/server';
import { listThreads, buildPreview } from '@/features/forum';
import { auth } from '@/shared/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 50);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);
    const q = searchParams.get('q')?.trim() || undefined;
    const tag = searchParams.get('tag')?.trim() || undefined;
    const rawSort = searchParams.get('sort');
    const sort: 'new' | 'hot' | 'top' =
      rawSort === 'hot' || rawSort === 'top' ? rawSort : 'new';

    const viewer = await auth();

    const threads = await listThreads({
      limit,
      offset,
      q,
      tag,
      sort,
      viewerId: viewer?.id,
    });

    const items = threads.map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      tags: t.tags,
      commentCount: t.commentCount,
      likeCount: t.likeCount,
      liked: t.liked,
      bookmarked: t.bookmarked,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      editedAt: t.editedAt,
      preview: buildPreview(t.contentText, 320),
      coverImageUrl: t.coverImageUrl,
      // contentHtml se carga on-demand vía /api/public/threads/[slug] cuando
      // el cliente necesita el HTML (expand en el feed, o página de detalle).
      author: t.author,
    }));

    return NextResponse.json({
      threads: items,
      limit,
      offset,
      sort,
      // `hasMore` exacto requeriría un count() extra. Aproximación: si
      // devolvimos el `limit` completo, asumimos que puede haber más.
      hasMore: items.length === limit,
    });
  } catch (error) {
    console.error('[API public/threads GET Error]:', error);
    return NextResponse.json({ error: 'Error al obtener hilos' }, { status: 500 });
  }
}
