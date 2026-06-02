// GET  /api/notifications — lista últimas 20 notificaciones del user.
// PATCH /api/notifications — marcar todas como leídas (o IDs específicos
// vía body { ids: [...] }).

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import {
  listNotifications,
  countUnreadNotifications,
  markNotificationsAsRead,
} from '@/features/forum';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '20', 10) || 20,
      50,
    );

    const [notifications, unreadCount] = await Promise.all([
      listNotifications(authUser.id, { limit, unreadOnly }),
      countUnreadNotifications(authUser.id),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[API notifications GET Error]:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : undefined;

    const count = await markNotificationsAsRead(authUser.id, ids);
    return NextResponse.json({ success: true, marked: count });
  } catch (error) {
    console.error('[API notifications PATCH Error]:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
