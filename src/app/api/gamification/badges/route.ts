import { NextResponse } from 'next/server';
import { getUser } from '@/shared/lib/supabase/auth';
import { getUserBadges } from '@/features/gamification/lib/badges';

export async function GET() {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const badges = await getUserBadges(user.id);

  return NextResponse.json({
    success: true,
    data: badges,
  });
}
