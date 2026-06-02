// POST /api/threads
// Crea un nuevo hilo del foro. Requiere autenticación.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import { createThread, createThreadSchema } from '@/features/forum';
import { checkForumRateLimit } from '@/shared/lib/ratelimit';

export async function POST(request: NextRequest) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const rateLimited = await checkForumRateLimit(authUser.id, 'thread');
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = createThreadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const thread = await createThread(authUser.id, parsed.data);

    return NextResponse.json({ success: true, thread });
  } catch (error) {
    console.error('[API threads POST Error]:', error);
    const message = error instanceof Error ? error.message : 'Error al crear hilo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
