// POST /api/threads/[id]/comments
// Crea un comentario en un hilo. Requiere autenticación.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import { createComment, createCommentSchema } from '@/features/forum';
import { checkForumRateLimit } from '@/shared/lib/ratelimit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const rateLimited = await checkForumRateLimit(authUser.id, 'comment');
    if (rateLimited) return rateLimited;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Thread id requerido' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const comment = await createComment(authUser.id, id, parsed.data);
    if (!comment) {
      return NextResponse.json({ error: 'Hilo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('[API threads/[id]/comments POST Error]:', error);
    const message = error instanceof Error ? error.message : 'Error al crear comentario';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
