import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '@/features/gamification/lib/leaderboard';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);

  const leaderboard = await getLeaderboard(limit);

  return NextResponse.json({
    success: true,
    data: leaderboard,
  });
}
