import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { prisma } from '@/shared/lib/prisma';
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/shared/lib/seo/jsonld';

interface Props {
  params: Promise<{ slug: string }>;
}

type PostRow = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  image: string | null;
  slug: string;
  createdAt: Date;
  authorFullName: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
};

async function getPost(slug: string): Promise<PostRow | null> {
  const rows = await prisma.$queryRaw<PostRow[]>`
    SELECT
      p.id,
      p.title,
      p.content,
      p.excerpt,
      p.cover_image_url AS "image",
      p.slug,
      p.created_at      AS "createdAt",
      dp.full_name      AS "authorFullName",
      dp.username       AS "authorUsername",
      dp.avatar_url     AS "authorAvatarUrl"
    FROM posts p
    LEFT JOIN profiles dp ON dp.id = p.user_id
    WHERE p.slug = ${slug}
      AND p.published = true
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Artículo no encontrado' };
  const canonicalUrl = `https://inmogrid.cl/blog/${slug}`;
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? '',
      type: 'article',
      url: canonicalUrl,
      images: post.image
        ? [{ url: post.image, width: 1200, height: 630, alt: post.title }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt ?? '',
      images: post.image ? [post.image] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  const authorName = post.authorFullName ?? post.authorUsername ?? 'Anónimo';
  const authorHref = post.authorUsername ? `/${post.authorUsername}` : '#';
  const siteAuthorUrl = post.authorUsername
    ? `https://inmogrid.cl/${post.authorUsername}`
    : null;

  const postingLd = blogPostingJsonLd({
    title: post.title,
    description: post.excerpt ?? post.title,
    slug: post.slug,
    image: post.image,
    publishedAt: post.createdAt,
    updatedAt: post.createdAt,
    authorName,
    authorUrl: siteAuthorUrl,
  });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: 'https://inmogrid.cl' },
    { name: 'Blog', url: 'https://inmogrid.cl/blog' },
    { name: post.title, url: `https://inmogrid.cl/blog/${post.slug}` },
  ]);

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postingLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="border-b border-gray-100 px-4 md:px-8">
        <div className="max-w-3xl mx-auto h-10 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/blog" className="hover:text-gray-900">
            Blog
          </Link>
          <span>/</span>
          <span className="text-gray-700 truncate">{post.title}</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-3">
            {post.authorAvatarUrl ? (
              <Image
                src={post.authorAvatarUrl}
                alt={authorName}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-sm font-bold text-yellow-700">
                {authorName[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-sm text-gray-500">
              <Link href={authorHref} className="font-medium text-gray-700 hover:text-gray-900">
                {authorName}
              </Link>
              <span className="mx-1">·</span>
              {new Date(post.createdAt).toLocaleDateString('es-CL', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </div>
          </div>
        </header>

        {post.image && (
          <div className="mb-8 rounded-xl overflow-hidden aspect-video relative">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        <article className="markdown-content prose prose-lg max-w-none prose-headings:font-bold prose-a:text-yellow-600 prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
