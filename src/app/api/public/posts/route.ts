// GET /api/public/posts - Feed público de posts publicados (sin autenticación)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { Prisma } from '@prisma/client';

type PostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  tags: string[];
  readTime: number | null;
  authorUsername: string | null;
  authorFullName: string | null;
  authorAvatarUrl: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const tag = searchParams.get('tag');

    const tagFilter = tag
      ? Prisma.sql`AND p.tags @> ARRAY[${tag}]::text[]`
      : Prisma.empty;

    const [rows, countResult] = await Promise.all([
      prisma.$queryRaw<PostRow[]>`
        SELECT
          p.id,
          p.title,
          p.slug,
          p.excerpt,
          p.cover_image_url   AS "coverImageUrl",
          p.created_at        AS "publishedAt",
          '{}'::text[]        AS tags,
          NULL::int           AS "readTime",
          dp.username         AS "authorUsername",
          dp.full_name        AS "authorFullName",
          dp.avatar_url       AS "authorAvatarUrl"
        FROM posts p
        LEFT JOIN profiles dp ON dp.id = p.user_id
        WHERE p.published = true
        ${tagFilter}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count
        FROM posts p
        WHERE p.published = true
        ${tagFilter}
      `,
    ]);

    const posts = rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      coverImageUrl: r.coverImageUrl,
      publishedAt: r.publishedAt,
      tags: r.tags,
      readTime: r.readTime,
      author: {
        username: r.authorUsername,
        fullName: r.authorFullName,
        avatarUrl: r.authorAvatarUrl,
      },
    }));

    const total = Number(countResult[0].count);

    return NextResponse.json({ posts, total, limit, offset });
  } catch (error) {
    console.error('[API public/posts GET Error]:', error);
    return NextResponse.json({ error: 'Error al obtener posts' }, { status: 500 });
  }
}
