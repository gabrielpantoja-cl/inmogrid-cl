'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  ClockIcon,
  FireIcon,
  TrophyIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ThreadCard } from './ThreadCard';
import type { ThreadListItem } from './types';

const PAGE_SIZE = 20;
type SortKey = 'new' | 'hot' | 'top';

const SORT_TABS: { key: SortKey; label: string; icon: typeof ClockIcon; hint: string }[] = [
  { key: 'new', label: 'Recientes', icon: ClockIcon, hint: 'Cronológico inverso' },
  { key: 'hot', label: 'Populares', icon: FireIcon, hint: 'Actividad últimos 7 días' },
  { key: 'top', label: 'Top', icon: TrophyIcon, hint: 'Mejor valorados de todos los tiempos' },
];

interface ThreadFeedProps {
  /** Hilos pre-renderizados server-side. Si viene, el feed no hace fetch inicial. */
  initialThreads?: ThreadListItem[];
  initialSort?: SortKey;
  /** Si el server ya filtró por tag (?tag=…), lo recibimos para mantener
   *  consistencia al cambiar de pestaña — el tag se conserva en cada fetch. */
  initialTag?: string;
}

export function ThreadFeed({
  initialThreads,
  initialSort = 'new',
  initialTag,
}: ThreadFeedProps = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [threads, setThreads] = useState<ThreadListItem[]>(initialThreads ?? []);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [activeTag, setActiveTag] = useState<string | undefined>(initialTag);
  const [offset, setOffset] = useState(initialThreads?.length ?? 0);
  const [hasMore, setHasMore] = useState(
    (initialThreads?.length ?? 0) >= PAGE_SIZE,
  );
  const [loading, setLoading] = useState(initialThreads === undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // Token monotónico para descartar respuestas stale al cambiar tabs/tag.
  const requestToken = useRef(0);

  const fetchPage = useCallback(
    async (opts: {
      sort: SortKey;
      offset: number;
      append: boolean;
      tag?: string;
    }) => {
      const token = ++requestToken.current;
      if (opts.append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(opts.offset),
          sort: opts.sort,
        });
        if (opts.tag) params.set('tag', opts.tag);
        const res = await fetch(`/api/public/threads?${params}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (token !== requestToken.current) return;

        const newThreads: ThreadListItem[] = data.threads ?? [];
        setThreads((prev) =>
          opts.append ? [...prev, ...newThreads] : newThreads,
        );
        setOffset(opts.offset + newThreads.length);
        setHasMore(Boolean(data.hasMore));
      } catch {
        if (token === requestToken.current) {
          if (!opts.append) setThreads([]);
          setHasMore(false);
        }
      } finally {
        if (token === requestToken.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  // Carga inicial si no vinieron de SSR.
  useEffect(() => {
    if (initialThreads !== undefined) return;
    void fetchPage({ sort, offset: 0, append: false, tag: activeTag });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar sort y tag con el querystring al navegar atrás/adelante.
  useEffect(() => {
    const urlSort = searchParams.get('sort');
    const urlTag = searchParams.get('tag') ?? undefined;
    let changed = false;
    let nextSort = sort;
    if (
      (urlSort === 'hot' || urlSort === 'top' || urlSort === 'new') &&
      urlSort !== sort
    ) {
      nextSort = urlSort;
      setSort(urlSort);
      changed = true;
    } else if (!urlSort && sort !== 'new') {
      nextSort = 'new';
      setSort('new');
      changed = true;
    }
    if (urlTag !== activeTag) {
      setActiveTag(urlTag);
      changed = true;
    }
    if (changed) {
      void fetchPage({ sort: nextSort, offset: 0, append: false, tag: urlTag });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // IntersectionObserver para infinite scroll.
  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchPage({ sort, offset, append: true, tag: activeTag });
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, sort, offset, activeTag, fetchPage]);

  const handleSortChange = (next: SortKey) => {
    if (next === sort) return;
    const params = new URLSearchParams(searchParams);
    if (next === 'new') params.delete('sort');
    else params.set('sort', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleClearTag = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('tag');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const headerSubtitle = useMemo(() => {
    if (activeTag) return `Filtrando por #${activeTag}`;
    return 'Comunidad inmobiliaria';
  }, [activeTag]);

  return (
    <div className="space-y-4">
      {/* Header sticky con tabs + tag activo. Usamos el mismo container del
          feed para que en mobile sea full-width y en desktop se alinee con
          las cards. */}
      <div className="sticky top-14 z-20 -mx-4 md:-mx-6 px-4 md:px-6 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80">
        <div className="flex items-end justify-between gap-3 py-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              Foro
            </h1>
            <p className="text-xs text-gray-500 truncate">{headerSubtitle}</p>
          </div>
          <Link
            href="/foro/nuevo"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3.5 py-1.5 text-xs font-semibold shadow-sm"
          >
            <span aria-hidden>＋</span>
            Crear hilo
          </Link>
        </div>
        <div className="-mx-1 flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin">
          {SORT_TABS.map((tab) => {
            const active = sort === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleSortChange(tab.key)}
                aria-pressed={active}
                title={tab.hint}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {tab.label}
              </button>
            );
          })}
          {activeTag && (
            <button
              type="button"
              onClick={handleClearTag}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium whitespace-nowrap"
              title="Quitar filtro de tag"
            >
              #{activeTag}
              <XMarkIcon className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-3 bg-gray-100 rounded w-40 mb-3" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1.5" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">
            {activeTag
              ? `No hay hilos con #${activeTag} todavía.`
              : sort === 'hot'
              ? 'No hubo actividad en los últimos 7 días.'
              : 'Aún no hay hilos. Sé el primero en publicar.'}
          </p>
          <Link
            href="/foro/nuevo"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2 text-sm font-semibold"
          >
            <span aria-hidden>＋</span>
            Crear hilo
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="py-8 text-center">
              {loadingMore ? (
                <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Cargando más hilos…
                </div>
              ) : (
                <span className="text-xs text-gray-400">Desplázate para ver más</span>
              )}
            </div>
          )}
          {!hasMore && threads.length >= PAGE_SIZE && (
            <p className="py-8 text-center text-xs text-gray-400">
              · Llegaste al final ·
            </p>
          )}
        </>
      )}
    </div>
  );
}
