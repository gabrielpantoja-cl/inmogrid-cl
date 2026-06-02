// Landing pública del foro — vive bajo /foro como hub propio para SEO.
// Renderiza el mismo feed que la home (/) pero con metadata orientada
// específicamente a "foro inmobiliario chileno" y un copy distinto.

import type { Metadata } from 'next';
import {
  listThreads,
  listTrendingTags,
  listUnansweredThreads,
  buildPreview,
  type ThreadSort,
} from '@/features/forum';
import { auth } from '@/shared/lib/auth';
import { ThreadFeed } from '@/shared/components/forum/ThreadFeed';
import { ForumSidebar } from '@/shared/components/forum/ForumSidebar';
import { CreateThreadFab } from '@/shared/components/forum/CreateThreadFab';
import type { ThreadListItem } from '@/shared/components/forum/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Foro inmobiliario · inmogrid.cl',
  description:
    'Comunidad chilena de profesionales inmobiliarios: tasadores, peritos, corredores, abogados y propietarios comparten dudas, casos y mejores prácticas.',
  alternates: { canonical: 'https://inmogrid.cl/foro' },
  openGraph: {
    title: 'Foro inmobiliario · inmogrid.cl',
    description:
      'Comunidad chilena de profesionales inmobiliarios — preguntas, casos y discusiones del mercado.',
    url: 'https://inmogrid.cl/foro',
    type: 'website',
    locale: 'es_CL',
  },
};

interface PageProps {
  searchParams: Promise<{ sort?: string; tag?: string }>;
}

export default async function ForoLandingPage({ searchParams }: PageProps) {
  const viewer = await auth();
  const { sort: rawSort, tag } = await searchParams;
  const sort: ThreadSort =
    rawSort === 'hot' || rawSort === 'top' ? rawSort : 'new';

  let initialThreads: ThreadListItem[] = [];
  let trendingTags: { tag: string; count: number }[] = [];
  let unanswered: Array<{
    id: string;
    title: string;
    slug: string;
    createdAt: string;
  }> = [];

  try {
    const [rows, tags, unansweredRows] = await Promise.all([
      listThreads({
        limit: 20,
        sort,
        tag: tag?.trim() || undefined,
        viewerId: viewer?.id,
      }),
      listTrendingTags({ days: 30, limit: 8 }),
      listUnansweredThreads({ limit: 5, days: 90 }),
    ]);
    initialThreads = rows.map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      tags: t.tags,
      commentCount: t.commentCount,
      likeCount: t.likeCount,
      liked: t.liked,
      bookmarked: t.bookmarked,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      editedAt: t.editedAt ? t.editedAt.toISOString() : null,
      preview: buildPreview(t.contentText, 320),
      coverImageUrl: t.coverImageUrl,
      author: t.author,
    }));
    trendingTags = tags;
    unanswered = unansweredRows.map((u) => ({
      id: u.id,
      title: u.title,
      slug: u.slug,
      createdAt: u.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error(
      '[ForoLanding] data failed:',
      err instanceof Error ? err.message : err,
    );
  }

  return (
    <>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 md:px-6 py-6 md:py-8">
        <div className="flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0">
          <ThreadFeed
            initialThreads={initialThreads}
            initialSort={sort}
            initialTag={tag?.trim() || undefined}
          />
        </div>
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-20">
            <ForumSidebar
              trendingTags={trendingTags}
              unanswered={unanswered}
              activeTag={tag?.trim() || undefined}
            />
          </div>
        </aside>
      </div>
      <CreateThreadFab authenticated={!!viewer?.id} />
    </>
  );
}
