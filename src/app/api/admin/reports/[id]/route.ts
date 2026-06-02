// PATCH /api/admin/reports/[id] — actualiza status del reporte + acción
// opcional sobre el target. Transaccional: si la acción falla, el reporte
// mantiene su status anterior.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/shared/lib/auth';
import { getProfile, isAdminRole } from '@/shared/lib/supabase/auth';
import { updateReport } from '@/features/forum';

const bodySchema = z.object({
  status: z.enum(['reviewed', 'dismissed', 'actioned', 'pending']),
  action: z
    .enum(['hide_thread', 'restore_thread', 'delete_comment'])
    .nullable()
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const profile = await getProfile(authUser.id);
    if (!isAdminRole(profile?.role)) {
      return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await updateReport({
      reportId: id,
      reviewerId: authUser.id,
      newStatus: parsed.data.status,
      action: parsed.data.action ?? null,
    });

    if (result.notFound) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, report: result.report });
  } catch (error) {
    console.error('[API admin/reports PATCH Error]:', error);
    const message = error instanceof Error ? error.message : 'Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
