'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { RichTextEditor } from '@/shared/components/editor/RichTextEditor';
import { SignInPromptDialog } from './SignInPromptDialog';
import { ThreadOwnerMenu } from './ThreadOwnerMenu';
import { ThreadActionBar } from './ThreadActionBar';
import type { ThreadListItem } from './types';

const PREVIEW_TRUNCATE_AT = 220;

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
  });
}

export function ThreadCard({ thread }: { thread: ThreadListItem }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentValue, setCommentValue] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [signInPrompt, setSignInPrompt] = useState<string | null>(null);
  // Lazy load del HTML completo — el listado solo trae preview (texto plano)
  // para que el payload del feed sea liviano. Al expandir hacemos fetch al
  // endpoint público de detalle. Si el thread ya viene con `contentHtml`
  // (contextos SSR con detail select), lo usamos directo.
  const [contentHtml, setContentHtml] = useState<string | null>(
    thread.contentHtml ?? null,
  );
  const [loadingContent, setLoadingContent] = useState(false);

  const authorLabel =
    thread.author.fullName || thread.author.username || 'Anónimo';
  const threadHref = `/foro/${thread.slug}`;
  const needsTruncation = thread.preview.length > PREVIEW_TRUNCATE_AT;
  const wasEdited = thread.editedAt !== null;
  const showCover = !!thread.coverImageUrl && !expanded;

  const handleToggleExpand = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (contentHtml || loadingContent) return;
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/public/threads/${thread.slug}`);
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      setContentHtml(data.thread?.contentHtml ?? '');
    } catch {
      // Fallback: mantener preview si el fetch falla — el usuario igual puede
      // clickear el título para ir al detalle.
      setContentHtml('');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleCommentToggle = () => {
    if (!isAuthenticated) {
      setSignInPrompt('comentar');
      return;
    }
    setComposerOpen((v) => !v);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingComment) return;

    const text = commentValue.replace(/<[^>]*>/g, '').trim();
    if (!text) {
      setCommentError('El comentario no puede estar vacío');
      return;
    }

    setSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/threads/${thread.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentHtml: commentValue }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCommentError(data.error ?? 'No se pudo publicar el comentario');
        return;
      }
      setCommentValue('');
      setComposerOpen(false);
      router.refresh();
    } catch {
      setCommentError('Error de red al publicar el comentario');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (hidden) return null;

  return (
    <article
      id={`thread-${thread.id}`}
      className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden scroll-mt-20"
    >
      <div className="px-5 pt-4 pb-3">
        {/* Header — autor + timestamp + menú */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          {thread.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thread.author.avatarUrl}
              alt=""
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <span className="w-5 h-5 rounded-full bg-gray-200" aria-hidden />
          )}
          <span className="font-medium text-gray-700">{authorLabel}</span>
          <span aria-hidden>·</span>
          <time dateTime={thread.createdAt}>
            {formatRelative(thread.createdAt)}
          </time>
          {wasEdited && (
            <span
              className="text-gray-400"
              title={`Editado el ${new Date(thread.editedAt!).toLocaleString('es-CL')}`}
            >
              · editado
            </span>
          )}
          <span className="ml-auto">
            <ThreadOwnerMenu
              threadId={thread.id}
              slug={thread.slug}
              authorId={thread.author.id}
              onDeleted={() => setHidden(true)}
            />
          </span>
        </div>

        {/* Título (link al detalle) */}
        <h2 className="text-lg font-semibold text-gray-900 leading-snug mb-1.5">
          <Link href={threadHref} className="hover:text-primary transition-colors">
            {thread.title}
          </Link>
        </h2>

        {/* Preview — expandible inline.
            Colapsado: texto plano con line-clamp-3 (ligero, no renderiza HTML).
            Expandido: contentHtml sanitizado renderizado con `prose`. Si no
            está cargado (listado no lo trae) se hace fetch al detail. */}
        {expanded && contentHtml ? (
          <div
            className="prose prose-sm max-w-none text-gray-800 leading-relaxed prose-p:my-5"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : expanded && loadingContent ? (
          <div className="mt-1 space-y-1.5" aria-label="Cargando contenido">
            <div className="h-3 bg-gray-100 rounded w-full animate-pulse" />
            <div className="h-3 bg-gray-100 rounded w-11/12 animate-pulse" />
            <div className="h-3 bg-gray-100 rounded w-3/4 animate-pulse" />
          </div>
        ) : (
          thread.preview && (
            <p
              className={`text-sm text-gray-600 leading-relaxed ${
                needsTruncation ? 'line-clamp-3' : ''
              }`}
            >
              {thread.preview}
            </p>
          )
        )}
        {needsTruncation && (
          <button
            type="button"
            onClick={handleToggleExpand}
            aria-expanded={expanded}
            className="mt-1 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
          >
            {expanded ? '← menos' : '…más'}
          </button>
        )}

        {/* Tags — clickeables como filtro */}
        {thread.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {thread.tags.slice(0, 5).map((tag) => (
              <Link
                key={tag}
                href={`/?tag=${encodeURIComponent(tag)}`}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Cover image — primera imagen del hilo, mostrada en el feed sin
          requerir expandir. aspect-ratio fijo para no saltar layout en
          scroll. Click navega al detalle (más natural que toggle). */}
      {showCover && thread.coverImageUrl && (
        <Link
          href={threadHref}
          aria-label={`Abrir hilo: ${thread.title}`}
          className="block bg-gray-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thread.coverImageUrl}
            alt=""
            loading="lazy"
            className="w-full max-h-[420px] object-cover"
          />
        </Link>
      )}

      {/* Barra de acciones reutilizable */}
      <ThreadActionBar
        threadId={thread.id}
        slug={thread.slug}
        title={thread.title}
        authorId={thread.author.id}
        initialLiked={thread.liked}
        initialLikeCount={thread.likeCount}
        initialBookmarked={thread.bookmarked}
        commentCount={thread.commentCount}
        onCommentClick={handleCommentToggle}
        variant="feed"
      />

      <SignInPromptDialog
        open={signInPrompt !== null}
        onClose={() => setSignInPrompt(null)}
        reason={signInPrompt ?? undefined}
        redirectTo={`/#thread-${thread.id}`}
      />

      {/* Comment composer inline */}
      {composerOpen && isAuthenticated && (
        <form
          onSubmit={handleSubmitComment}
          className="px-5 py-4 border-t border-gray-100 space-y-3"
        >
          <RichTextEditor
            value={commentValue}
            onChange={setCommentValue}
            placeholder="Escribe tu comentario…"
            minHeight={100}
            disabled={submittingComment}
          />
          {commentError && (
            <p className="text-sm text-red-600">{commentError}</p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setComposerOpen(false);
                setCommentValue('');
                setCommentError(null);
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingComment}
              className="rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors"
            >
              {submittingComment ? 'Publicando…' : 'Comentar'}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
