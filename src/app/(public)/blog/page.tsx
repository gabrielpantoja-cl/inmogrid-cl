// Blog index — server component SSR para que Google vea títulos y
// resúmenes en el HTML inicial. Query raw contra las columnas legacy
// (`status`, `image`, `author_id`) que es lo que usa /api/public/posts.

import type { Metadata } from 'next';
import { prisma } from '@/shared/lib/prisma';
import { PostCard, type PostCardData } from '@/shared/components/posts/PostCard';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Artículos, análisis y guías sobre el mercado inmobiliario chileno — tasación, peritaje, CBR, expropiaciones y más.',
  alternates: { canonical: 'https://inmogrid.cl/blog' },
  openGraph: {
    title: 'Blog · inmogrid.cl',
    description:
      'Artículos y análisis sobre el mercado inmobiliario chileno por la comunidad de tasadores, peritos, corredores y profesionales del rubro.',
    url: 'https://inmogrid.cl/blog',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

type PostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  authorUsername: string | null;
  authorFullName: string | null;
  authorAvatarUrl: string | null;
};

async function getPosts(): Promise<PostCardData[]> {
  try {
    const rows = await prisma.$queryRaw<PostRow[]>`
      SELECT
        p.id,
        p.title,
        p.slug,
        p.excerpt,
        p.cover_image_url AS "coverImageUrl",
        p.created_at    AS "publishedAt",
        dp.username     AS "authorUsername",
        dp.full_name    AS "authorFullName",
        dp.avatar_url   AS "authorAvatarUrl"
      FROM posts p
      LEFT JOIN profiles dp ON dp.id = p.user_id
      WHERE p.published = true
      ORDER BY p.created_at DESC
      LIMIT 30
    `;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      coverImageUrl: r.coverImageUrl,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      tags: [],
      readTime: null,
      author: {
        username: r.authorUsername,
        fullName: r.authorFullName,
        avatarUrl: r.authorAvatarUrl,
      },
    }));
  } catch (err) {
    console.error('[BlogPage] getPosts failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
        <p className="text-sm text-gray-600 mt-1">
          Artículos, análisis y guías sobre el mercado inmobiliario chileno.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">Aún no hay publicaciones.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
