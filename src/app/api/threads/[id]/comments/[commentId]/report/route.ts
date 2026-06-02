// POST /api/threads/[id]/comments/[commentId]/report

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import { createForumReport, reportSchema } from '@/features/forum';
import { checkForumRateLimit } from '@/shared/lib/ratelimit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const rateLimited = await checkForumRateLimit(authUser.id, 'report');
    if (rateLimited) return rateLimited;

    const { commentId } = await params;
    const body = await request.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await createForumReport(
      authUser.id,
      'comment',
      commentId,
      parsed.data,
    );

    if (result.notFound) {
      return NextResponse.json(
        { error: 'Comentario no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, duplicate: result.duplicate });
  } catch (error) {
    console.error('[API comments/report POST Error]:', error);
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
