// Home pública — server component que SSR-ea el feed del foro.
// Google recibe HTML con títulos, contenido y links; la interactividad
// (likes, bookmarks, botones de auth) se hidrata cliente-side.

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
import { FarewellBanner } from '@/shared/components/forum/FarewellBanner';
import type { ThreadListItem } from '@/shared/components/forum/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ sort?: string; tag?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
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
      // contentHtml se carga on-demand cuando el usuario expande un hilo.
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
      '[HomePage] forum data failed:',
      err instanceof Error ? err.message : err,
    );
  }

  return (
    <>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 md:px-6 py-6 md:py-8">
        <div className="flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0">
          <FarewellBanner />
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
