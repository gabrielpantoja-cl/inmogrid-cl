// app/api/users/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';

export async function POST(req: NextRequest) {
  const { username } = await req.json();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { username },
      select: { id: true, username: true, fullName: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
