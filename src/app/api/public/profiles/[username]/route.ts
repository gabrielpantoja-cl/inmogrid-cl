// API pública para obtener perfil de usuario por username
// GET /api/public/profiles/[username]
// NO requiere autenticación

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const profile = await prisma.profile.findUnique({
      where: { username },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        username: true,
        tagline: true,
        bio: true,
        coverImageUrl: true,
        location: true,
        identityTags: true,
        externalLinks: true,
        profession: true,
        company: true,
        website: true,
        linkedin: true,
        isPublicProfile: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!profile.isPublicProfile) {
      return NextResponse.json(
        { error: 'Este perfil es privado' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('[API Public Profiles Error]:', error);
    return NextResponse.json(
      { error: 'Error al obtener perfil' },
      { status: 500 }
    );
  }
}
