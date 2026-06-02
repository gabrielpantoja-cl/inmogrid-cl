// PATCH /api/threads/[id] — editar hilo (solo autor o admin)
// DELETE /api/threads/[id] — borrar hilo (solo autor o admin)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import {
  updateThread,
  deleteThread,
  getThreadAuthor,
  updateThreadSchema,
} from '@/features/forum';
import { getProfile, isAdminRole } from '@/shared/lib/supabase/auth';

async function authorizeOwner(
  userId: string,
  threadId: string,
): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const row = await getThreadAuthor(threadId);
  if (!row) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Hilo no encontrado' }, { status: 404 }),
    };
  }

  if (row.authorId === userId) return { ok: true };

  const profile = await getProfile(userId);
  if (isAdminRole(profile?.role)) return { ok: true };

  return {
    ok: false,
    response: NextResponse.json(
      { error: 'No autorizado para modificar este hilo' },
      { status: 403 },
    ),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const authz = await authorizeOwner(authUser.id, id);
    if (!authz.ok) return authz.response;

    const body = await request.json();
    const parsed = updateThreadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await updateThread(id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'Hilo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, thread: updated });
  } catch (error) {
    console.error('[API threads PATCH Error]:', error);
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const authz = await authorizeOwner(authUser.id, id);
    if (!authz.ok) return authz.response;

    const deleted = await deleteThread(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Hilo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API threads DELETE Error]:', error);
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
