import { NextRequest, NextResponse } from 'next/server';
import { getUser, getProfile, isAdminRole } from '@/shared/lib/supabase/auth';
import prisma from '@/shared/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const appraisal = await prisma.appraisal.findUnique({ where: { id } });

    if (!appraisal) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const profile = await getProfile(user.id);
    const isAdmin = isAdminRole(profile?.role);

    if (appraisal.userId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
    }

    return NextResponse.json(appraisal);
  } catch (err) {
    console.error('[api/tasacion/[id] GET]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const appraisal = await prisma.appraisal.findUnique({ where: { id } });

    if (!appraisal) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    if (appraisal.userId !== user.id) {
      const profile = await getProfile(user.id);
      if (!isAdminRole(profile?.role)) {
        return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
      }
    }

    await prisma.appraisal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/tasacion/[id] DELETE]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
