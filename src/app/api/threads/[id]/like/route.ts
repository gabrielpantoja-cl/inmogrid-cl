// POST /api/threads/[id]/like
// Toggle del like del usuario autenticado sobre un hilo. Idempotente —
// llamarlo dos veces deja el estado anterior (vuelve a 0 likes por el
// user). Retorna { liked, likeCount } para que el cliente reconcilie.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import { toggleThreadLike } from '@/features/forum';
import { checkForumRateLimit } from '@/shared/lib/ratelimit';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const rateLimited = await checkForumRateLimit(authUser.id, 'reaction');
    if (rateLimited) return rateLimited;

    const { id } = await params;
    const result = await toggleThreadLike(authUser.id, id);

    if (!result) {
      return NextResponse.json({ error: 'Hilo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API threads/like POST Error]:', error);
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
