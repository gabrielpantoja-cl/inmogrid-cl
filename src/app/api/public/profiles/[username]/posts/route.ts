// API pública para obtener posts de un usuario
// GET /api/public/profiles/[username]/posts
// NO requiere autenticación

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const { searchParams } = new URL(request.url);

    const tag = searchParams.get('tag');
    const limit = parseInt(searchParams.get('limit') || '10');

    const profile = await prisma.profile.findUnique({
      where: { username },
      select: { id: true, isPublicProfile: true },
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

    const where: any = {
      userId: profile.id,
      published: true,
    };

    if (tag) {
      where.tags = { has: tag };
    }

    const posts = await prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImageUrl: true,
        tags: true,
        readTime: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
    });
  } catch (error) {
    console.error('[API Public Posts Error]:', error);
    return NextResponse.json(
      { error: 'Error al obtener posts' },
      { status: 500 }
    );
  }
}
