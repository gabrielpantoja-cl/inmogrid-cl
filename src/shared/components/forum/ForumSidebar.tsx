import Link from 'next/link';
import {
  HashtagIcon,
  ChatBubbleLeftEllipsisIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

interface TrendingTag {
  tag: string;
  count: number;
}

interface UnansweredItem {
  id: string;
  title: string;
  slug: string;
  createdAt: string;
}

interface Props {
  trendingTags: TrendingTag[];
  unanswered: UnansweredItem[];
  /** Si hay un tag activo en el filtro, lo destacamos en la lista. */
  activeTag?: string;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'hoy';
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Sidebar derecho del foro — server component, datos pre-renderizados.
 * Pinta tres bloques: CTA crear hilo + tags trending + hilos sin responder.
 *
 * Pensado para desktop ≥1024px; en mobile/tablet la home no lo monta.
 */
export function ForumSidebar({ trendingTags, unanswered, activeTag }: Props) {
  return (
    <div className="space-y-4">
      {/* CTA — siempre visible para invitar a contribuir */}
      <Link
        href="/foro/nuevo"
        className="group block rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 p-4 transition-colors"
      >
        <div className="flex items-center gap-2 text-primary">
          <PencilSquareIcon className="h-5 w-5" aria-hidden />
          <span className="text-sm font-semibold">Comparte tu experiencia</span>
        </div>
        <p className="mt-1 text-xs text-gray-600 leading-relaxed">
          Pregunta, responde o publica un caso. La comunidad se beneficia de
          cada aporte.
        </p>
      </Link>

      {trendingTags.length > 0 && (
        <section
          aria-labelledby="sidebar-trending"
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <h2
            id="sidebar-trending"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3"
          >
            <HashtagIcon className="h-3.5 w-3.5" aria-hidden />
            Tags del último mes
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {trendingTags.map((t) => {
              const isActive = activeTag === t.tag;
              return (
                <li key={t.tag}>
                  <Link
                    href={`/?tag=${encodeURIComponent(t.tag)}`}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 text-gray-700 hover:bg-primary/10 hover:text-primary'
                    }`}
                    title={`${t.count} hilos`}
                  >
                    #{t.tag}
                    <span
                      className={`text-[10px] ${
                        isActive ? 'text-primary-foreground/80' : 'text-gray-500'
                      }`}
                    >
                      {t.count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {unanswered.length > 0 && (
        <section
          aria-labelledby="sidebar-unanswered"
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <h2
            id="sidebar-unanswered"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3"
          >
            <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" aria-hidden />
            Esperan respuesta
          </h2>
          <ul className="space-y-3">
            {unanswered.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/foro/${u.slug}`}
                  className="group block"
                >
                  <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {u.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {relativeTime(u.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trendingTags.length === 0 && unanswered.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-500">
          La comunidad recién se está activando. Tu hilo puede ser la chispa.
        </div>
      )}
    </div>
  );
}
