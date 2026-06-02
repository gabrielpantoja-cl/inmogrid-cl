import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getThreadBySlug, listCommentsByThread } from '@/features/forum';
import { ThreadDetail } from '@/shared/components/forum/ThreadDetail';
import { auth } from '@/shared/lib/auth';
import { discussionForumPostingJsonLd, breadcrumbJsonLd } from '@/shared/lib/seo/jsonld';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug);
  if (!thread) {
    return {
      title: 'Hilo no encontrado · inmogrid',
      alternates: { canonical: `https://inmogrid.cl/foro/${slug}` },
    };
  }

  // contentText arrastra whitespace del editor — colapsar antes de truncar.
  const clean = thread.contentText.replace(/\s+/g, ' ').trim();
  const description =
    clean.length > 160 ? `${clean.slice(0, 157).trimEnd()}…` : clean;
  const url = `https://inmogrid.cl/foro/${thread.slug}`;
  const ogImage = `https://inmogrid.cl/api/og/thread/${thread.slug}`;

  return {
    title: `${thread.title} · inmogrid`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: thread.title,
      description,
      type: 'article',
      url,
      siteName: 'inmogrid.cl',
      locale: 'es_CL',
      publishedTime: thread.createdAt.toISOString(),
      modifiedTime: thread.updatedAt.toISOString(),
      authors: thread.author?.username
        ? [`https://inmogrid.cl/${thread.author.username}`]
        : undefined,
      tags: thread.tags,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: thread.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: thread.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ThreadPage({ params }: Props) {
  const { slug } = await params;
  const viewer = await auth();
  const thread = await getThreadBySlug(slug, viewer?.id);
  if (!thread) notFound();

  const comments = await listCommentsByThread(thread.id);

  const serializable = {
    id: thread.id,
    title: thread.title,
    slug: thread.slug,
    contentHtml: thread.contentHtml,
    tags: thread.tags,
    commentCount: thread.commentCount,
    likeCount: thread.likeCount,
    liked: thread.liked,
    bookmarked: thread.bookmarked,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    editedAt: thread.editedAt ? thread.editedAt.toISOString() : null,
    author: thread.author,
  };

  const serializableComments = comments.map((c) => ({
    id: c.id,
    contentHtml: c.contentHtml,
    createdAt: c.createdAt.toISOString(),
    editedAt: c.editedAt ? c.editedAt.toISOString() : null,
    parentId: c.parentId,
    author: c.author,
  }));

  const authorName =
    thread.author?.fullName ?? thread.author?.username ?? 'Anónimo';
  const authorUrl = thread.author?.username
    ? `https://inmogrid.cl/${thread.author.username}`
    : null;

  const discussionLd = discussionForumPostingJsonLd({
    title: thread.title,
    description: thread.contentText.slice(0, 300),
    slug: thread.slug,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    authorName,
    authorUrl,
    commentCount: thread.commentCount,
    likeCount: thread.likeCount,
  });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Inicio', url: 'https://inmogrid.cl' },
    { name: 'Foro', url: 'https://inmogrid.cl/' },
    { name: thread.title, url: `https://inmogrid.cl/foro/${thread.slug}` },
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(discussionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ThreadDetail thread={serializable} comments={serializableComments} />
    </div>
  );
}
