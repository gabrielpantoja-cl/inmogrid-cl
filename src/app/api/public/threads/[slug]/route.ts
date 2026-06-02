// GET /api/public/threads/[slug]
// Detalle público de un hilo + comentarios. Sin auth.

import { NextRequest, NextResponse } from 'next/server';
import { getThreadBySlug, listCommentsByThread } from '@/features/forum';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug requerido' }, { status: 400 });
    }

    const thread = await getThreadBySlug(slug);
    if (!thread) {
      return NextResponse.json({ error: 'Hilo no encontrado' }, { status: 404 });
    }

    const comments = await listCommentsByThread(thread.id);

    return NextResponse.json({
      thread: {
        id: thread.id,
        title: thread.title,
        slug: thread.slug,
        contentHtml: thread.contentHtml,
        tags: thread.tags,
        commentCount: thread.commentCount,
        likeCount: thread.likeCount,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        editedAt: thread.editedAt,
        author: thread.author,
      },
      comments,
    });
  } catch (error) {
    console.error('[API public/threads/[slug] GET Error]:', error);
    return NextResponse.json({ error: 'Error al obtener hilo' }, { status: 500 });
  }
}
