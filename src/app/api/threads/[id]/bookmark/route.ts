// POST /api/threads/[id]/bookmark
// Toggle del bookmark del usuario autenticado sobre un hilo. Sin contador
// global — los bookmarks son personales.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import { toggleThreadBookmark } from '@/features/forum';
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
    const result = await toggleThreadBookmark(authUser.id, id);

    if (!result) {
      return NextResponse.json({ error: 'Hilo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API threads/bookmark POST Error]:', error);
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
