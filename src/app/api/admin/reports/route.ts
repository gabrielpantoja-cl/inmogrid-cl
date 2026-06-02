// GET /api/admin/reports — lista reportes paginados con filtro por status.
// Solo admin/superadmin. El panel consume este endpoint para refrescar
// la lista después de una acción.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/shared/lib/auth';
import { getProfile, isAdminRole } from '@/shared/lib/supabase/auth';
import { listReports, type ReportFilterStatus } from '@/features/forum';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: ReportFilterStatus[] = [
  'pending',
  'reviewed',
  'dismissed',
  'actioned',
  'all',
];

export async function GET(request: NextRequest) {
  try {
    const authUser = await auth();
    if (!authUser?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const profile = await getProfile(authUser.id);
    if (!isAdminRole(profile?.role)) {
      return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status') ?? 'pending';
    const status = VALID_STATUSES.includes(rawStatus as ReportFilterStatus)
      ? (rawStatus as ReportFilterStatus)
      : 'pending';
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '30', 10) || 30,
      100,
    );
    const offset = Math.max(
      parseInt(searchParams.get('offset') ?? '0', 10) || 0,
      0,
    );

    const data = await listReports({ status, limit, offset });
    return NextResponse.json({ ...data, status, limit, offset });
  } catch (error) {
    console.error('[API admin/reports GET Error]:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
