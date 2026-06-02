import Link from 'next/link';
import { prisma } from '@/shared/lib/prisma';

type TabKey = 'hilos' | 'guardados' | 'likes';

interface Props {
  userId: string;
  username: string;
  activeTab: TabKey;
}

interface ThreadPreview {
  id: string;
  slug: string;
  title: string;
  contentText: string;
  commentCount: number;
  likeCount: number;
  createdAt: Date;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

async function fetchThreads(userId: string, tab: TabKey): Promise<ThreadPreview[]> {
  if (tab === 'hilos') {
    return prisma.forumThread.findMany({
      where: { authorId: userId, status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        slug: true,
        title: true,
        contentText: true,
        commentCount: true,
        likeCount: true,
        createdAt: true,
      },
    });
  }

  if (tab === 'guardados') {
    const rows = await prisma.forumThreadBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        thread: {
          select: {
            id: true,
            slug: true,
            title: true,
            contentText: true,
            commentCount: true,
            likeCount: true,
            createdAt: true,
            status: true,
          },
        },
      },
    });
    return rows
      .map((r) => r.thread)
      .filter((t) => t && t.status === 'published') as ThreadPreview[];
  }

  // likes
  const rows = await prisma.forumThreadLike.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      thread: {
        select: {
          id: true,
          slug: true,
          title: true,
          contentText: true,
          commentCount: true,
          likeCount: true,
          createdAt: true,
          status: true,
        },
      },
    },
  });
  return rows
    .map((r) => r.thread)
    .filter((t) => t && t.status === 'published') as ThreadPreview[];
}

async function fetchCounts(userId: string) {
  const [hilos, guardados, likes] = await Promise.all([
    prisma.forumThread.count({
      where: { authorId: userId, status: 'published' },
    }),
    prisma.forumThreadBookmark.count({ where: { userId } }),
    prisma.forumThreadLike.count({ where: { userId } }),
  ]);
  return { hilos, guardados, likes };
}

/**
 * Tabs del owner en su propio perfil — Hilos / Guardados / Likes.
 *
 * Server component. La tab activa se controla con `?tab=` en la URL;
 * cada tab hace click a un Link con el nuevo searchParam y Next rehidrata
 * con SSR. Decisión 2A del sprint de reestructuración del dashboard:
 * en vez de una página `/mis-hilos` dedicada, el owner ve sus propios
 * hilos embebidos en su perfil público.
 *
 * Solo se monta cuando el viewer autenticado es el owner del perfil —
 * otros usuarios NO ven esta sección.
 */
export default async function OwnerForumTabs({ userId, username, activeTab }: Props) {
  const [threads, counts] = await Promise.all([
    fetchThreads(userId, activeTab),
    fetchCounts(userId),
  ]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'hilos', label: 'Hilos', count: counts.hilos },
    { key: 'guardados', label: 'Guardados', count: counts.guardados },
    { key: 'likes', label: 'Me gusta', count: counts.likes },
  ];

  const emptyMessage: Record<TabKey, string> = {
    hilos: 'Aún no has publicado ningún hilo en el foro.',
    guardados: 'No has guardado ningún hilo todavía. Usa el ícono del marcador en cada hilo para guardarlo.',
    likes: 'No le has dado me gusta a ningún hilo todavía.',
  };

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Mi actividad en el foro</h2>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Actividad del foro"
        className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const href = tab.key === 'hilos' ? `/${username}` : `/${username}?tab=${tab.key}`;
          return (
            <Link
              key={tab.key}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={`relative whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold px-1.5 py-0.5 ${
                    isActive
                      ? 'bg-primary/20 text-gray-900'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Lista */}
      {threads.length === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-500 py-8">
          {emptyMessage[activeTab]}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/foro/${t.slug}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-gray-900">{t.title}</h3>
                {t.contentText && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {t.contentText.replace(/\s+/g, ' ').slice(0, 200)}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  <span>{formatDate(t.createdAt)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {t.likeCount} me gusta · {t.commentCount} comentario
                    {t.commentCount === 1 ? '' : 's'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
