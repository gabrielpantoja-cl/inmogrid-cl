'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ChatBubbleOvalLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CommentList } from './CommentList';
import { CommentComposer } from './CommentComposer';
import { ThreadOwnerMenu } from './ThreadOwnerMenu';
import { ThreadActionBar } from './ThreadActionBar';
import type { ThreadDetailData, ForumComment } from './types';

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'hace instantes';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  thread: ThreadDetailData;
  comments: ForumComment[];
}

export function ThreadDetail({ thread, comments }: Props) {
  const composerRef = useRef<HTMLDivElement>(null);
  const authorLabel =
    thread.author.fullName || thread.author.username || 'Anónimo';
  const authorHref = thread.author.username ? `/${thread.author.username}` : null;

  const focusComposer = useCallback(() => {
    composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Damos un nudge visual al composer.
    composerRef.current?.classList.add('ring-2', 'ring-primary/40');
    setTimeout(() => {
      composerRef.current?.classList.remove('ring-2', 'ring-primary/40');
    }, 1400);
  }, []);

  return (
    <article className="space-y-5">
      {/* Breadcrumb visible — más cómodo que solo "← Volver al foro" */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-gray-500"
      >
        <Link href="/" className="hover:text-primary transition-colors">
          Inicio
        </Link>
        <ChevronRightIcon className="h-3 w-3 text-gray-300" aria-hidden />
        <Link href="/" className="hover:text-primary transition-colors">
          Foro
        </Link>
        <ChevronRightIcon className="h-3 w-3 text-gray-300" aria-hidden />
        <span className="text-gray-700 truncate max-w-[55vw] sm:max-w-md">
          {thread.title}
        </span>
      </nav>

      <header className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 pt-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            {thread.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thread.author.avatarUrl}
                alt=""
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <span className="w-7 h-7 rounded-full bg-gray-200" aria-hidden />
            )}
            <div className="flex flex-col leading-tight">
              {authorHref ? (
                <Link
                  href={authorHref}
                  className="font-semibold text-gray-800 hover:text-primary transition-colors"
                >
                  {authorLabel}
                </Link>
              ) : (
                <span className="font-semibold text-gray-800">{authorLabel}</span>
              )}
              <time
                dateTime={thread.createdAt}
                title={formatAbsolute(thread.createdAt)}
                className="text-xs text-gray-500"
              >
                {formatRelative(thread.createdAt)}
                {thread.editedAt && (
                  <span
                    className="ml-1 text-gray-400"
                    title={`Editado el ${formatAbsolute(thread.editedAt)}`}
                  >
                    · editado
                  </span>
                )}
              </time>
            </div>
            <span className="ml-auto">
              <ThreadOwnerMenu
                threadId={thread.id}
                slug={thread.slug}
                authorId={thread.author.id}
                redirectAfterDelete
              />
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
            {thread.title}
          </h1>

          <div
            className="prose prose-sm md:prose-base max-w-none text-gray-800 prose-headings:font-semibold prose-headings:text-gray-900 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:border prose-img:border-gray-200 prose-blockquote:border-l-primary/40 prose-blockquote:text-gray-700 prose-li:my-0.5 prose-p:my-5 prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: thread.contentHtml }}
          />

          {thread.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {thread.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Action bar dentro del card — siempre visible bajo el contenido */}
        <div className="border-t border-gray-100 mt-6 px-3 py-1">
          <ThreadActionBar
            threadId={thread.id}
            slug={thread.slug}
            title={thread.title}
            authorId={thread.author.id}
            initialLiked={thread.liked}
            initialLikeCount={thread.likeCount}
            initialBookmarked={thread.bookmarked}
            commentCount={thread.commentCount}
            onCommentClick={focusComposer}
            variant="feed"
          />
        </div>
      </header>

      <section aria-labelledby="comments-heading" className="space-y-4">
        <h2
          id="comments-heading"
          className="inline-flex items-center gap-2 text-lg font-semibold text-gray-900"
        >
          <ChatBubbleOvalLeftIcon className="w-5 h-5" aria-hidden />
          {thread.commentCount} comentario{thread.commentCount === 1 ? '' : 's'}
        </h2>

        <div ref={composerRef} className="rounded-xl transition-shadow">
          <CommentComposer threadId={thread.id} />
        </div>
        <CommentList threadId={thread.id} comments={comments} />
      </section>
    </article>
  );
}
