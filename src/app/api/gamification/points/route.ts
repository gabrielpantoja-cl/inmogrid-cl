import { NextResponse } from 'next/server';
import { getUser } from '@/shared/lib/supabase/auth';
import { getUserTotalPoints, getPointsHistory } from '@/features/gamification/lib/points';

export async function GET() {
  const user = await getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const [totalPoints, history] = await Promise.all([
    getUserTotalPoints(user.id),
    getPointsHistory(user.id),
  ]);

  return NextResponse.json({
    success: true,
    data: { totalPoints, history },
  });
}
