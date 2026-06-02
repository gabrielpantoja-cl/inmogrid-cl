// PATCH/DELETE /api/threads/[id]/comments/[commentId]
// Autor del comentario o admin puede editar/borrar. El hilo owner no tiene
// privilegios sobre comentarios ajenos (modelo tipo Reddit, no Discord).

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import {
  updateComment,
  deleteComment,
  getCommentAuthor,
  updateCommentSchema,
} from '@/features/forum';
import { getProfile, isAdminRole } from '@/shared/lib/supabase/auth';

async function authorizeCommentOwner(
  userId: string,
  commentId: string,
): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const row = await getCommentAuthor(commentId);
  if (!row) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Comentario no encontrado' },
        { status: 404 },
      ),
    };
  }

  if (row.authorId === userId) return { ok: true };

  const profile = await getProfile(userId);
  if (isAdminRole(profile?.role)) return { ok: true };

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'No autorizado' },
      { status: 403 },
    ),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { commentId } = await params;
    const authz = await authorizeCommentOwner(authUser.id, commentId);
    if (!authz.ok) return authz.response;

    const body = await request.json();
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateComment(commentId, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, comment: updated });
  } catch (error) {
    console.error('[API comments PATCH Error]:', error);
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { commentId } = await params;
    const authz = await authorizeCommentOwner(authUser.id, commentId);
    if (!authz.ok) return authz.response;

    const deleted = await deleteComment(commentId);
    if (!deleted) {
      return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API comments DELETE Error]:', error);
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
