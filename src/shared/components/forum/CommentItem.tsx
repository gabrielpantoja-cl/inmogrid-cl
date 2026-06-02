'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
  FlagIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/shared/hooks/useAuth';
import { RichTextEditor } from '@/shared/components/editor/RichTextEditor';
import { ConfirmDialog } from './ConfirmDialog';
import { ReportDialog } from './ReportDialog';
import { SignInPromptDialog } from './SignInPromptDialog';
import type { ForumComment } from './types';

// Sincronizado con MAX_REPLY_DEPTH del backend. UI limita visualmente las
// ramas: nivel 0 = top-level, 1 = respuesta, 2 = respuesta a respuesta.
// A partir del nivel 2 los nuevos replies se reparentan al abuelo (server).
const MAX_DISPLAY_DEPTH = 2;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  threadId: string;
  comment: ForumComment;
  /** Árbol de comments indexado por parentId, para renderizar hijos. */
  tree: Map<string | null, ForumComment[]>;
  depth: number;
}

export function CommentItem({ threadId, comment: initial, tree, depth }: Props) {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [comment, setComment] = useState<ForumComment>(initial);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(initial.contentHtml);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyValue, setReplyValue] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [signInPrompt, setSignInPrompt] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const isOwner = !!user && user.id === comment.author.id;
  const canEdit = isOwner || isAdmin;
  const label =
    comment.author.fullName || comment.author.username || 'Anónimo';
  const canReply = depth < MAX_DISPLAY_DEPTH;
  const children = tree.get(comment.id) ?? [];

  const handleSaveEdit = async () => {
    if (submitting) return;
    const text = editValue.replace(/<[^>]*>/g, '').trim();
    if (!text) {
      setEditError('El comentario no puede estar vacío');
      return;
    }
    setSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/threads/${threadId}/comments/${comment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentHtml: editValue }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error ?? 'No se pudo guardar');
        return;
      }
      const data = await res.json();
      setComment({
        ...comment,
        contentHtml: data.comment.contentHtml,
        editedAt:
          typeof data.comment.editedAt === 'string'
            ? data.comment.editedAt
            : new Date().toISOString(),
      });
      setEditing(false);
    } catch {
      setEditError('Error de red al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/threads/${threadId}/comments/${comment.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('fail');
      setConfirmDelete(false);
      setHidden(true);
      router.refresh();
    } catch {
      setDeleting(false);
      alert('No se pudo borrar el comentario. Intenta de nuevo.');
    }
  };

  const handleSubmitReply = async () => {
    if (submittingReply) return;
    const text = replyValue.replace(/<[^>]*>/g, '').trim();
    if (!text) {
      setReplyError('La respuesta no puede estar vacía');
      return;
    }
    setSubmittingReply(true);
    setReplyError(null);
    try {
      const res = await fetch(`/api/threads/${threadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentHtml: replyValue,
          parentId: comment.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setReplyError(data.error ?? 'No se pudo publicar la respuesta');
        return;
      }
      setReplyValue('');
      setReplyOpen(false);
      router.refresh();
    } catch {
      setReplyError('Error de red al responder');
    } finally {
      setSubmittingReply(false);
    }
  };

  const openReply = () => {
    if (!isAuthenticated) {
      setSignInPrompt('responder');
      return;
    }
    setReplyOpen(true);
  };

  if (hidden) return null;

  return (
    <li
      id={`comment-${comment.id}`}
      className="rounded-xl border border-gray-200 bg-white p-4 scroll-mt-20"
    >
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
        {comment.author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.author.avatarUrl}
            alt=""
            className="w-5 h-5 rounded-full"
          />
        ) : (
          <span className="w-5 h-5 rounded-full bg-gray-200" aria-hidden />
        )}
        <span className="font-medium text-gray-700">{label}</span>
        <span aria-hidden>·</span>
        <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
        {comment.editedAt && (
          <span
            className="text-gray-400"
            title={`Editado el ${formatDate(comment.editedAt)}`}
          >
            · editado
          </span>
        )}
        {(canEdit || isAuthenticated) && (
          <div className="relative ml-auto" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Más acciones"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="rounded-md p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <EllipsisHorizontalIcon className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              >
                {canEdit && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditValue(comment.contentHtml);
                        setEditing(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmDelete(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Borrar
                    </button>
                  </>
                )}
                {isAuthenticated && !canEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FlagIcon className="h-4 w-4" />
                    Reportar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <RichTextEditor
            value={editValue}
            onChange={setEditValue}
            minHeight={100}
            disabled={submitting}
          />
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditValue(comment.contentHtml);
                setEditError(null);
              }}
              disabled={submitting}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={submitting}
              className="rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 px-4 py-1.5 text-sm font-medium text-primary-foreground"
            >
              {submitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="prose prose-sm max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: comment.contentHtml }}
        />
      )}

      {canReply && !editing && (
        <div className="mt-2">
          <button
            type="button"
            onClick={openReply}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-primary transition-colors"
          >
            <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
            Responder
          </button>
        </div>
      )}

      {replyOpen && isAuthenticated && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <RichTextEditor
            value={replyValue}
            onChange={setReplyValue}
            placeholder={`Responder a ${label}…`}
            minHeight={90}
            disabled={submittingReply}
          />
          {replyError && <p className="text-sm text-red-600">{replyError}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setReplyOpen(false);
                setReplyValue('');
                setReplyError(null);
              }}
              disabled={submittingReply}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitReply}
              disabled={submittingReply}
              className="rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 px-4 py-1.5 text-sm font-medium text-primary-foreground"
            >
              {submittingReply ? 'Publicando…' : 'Responder'}
            </button>
          </div>
        </div>
      )}

      {children.length > 0 && (
        <ul className="mt-4 space-y-3 border-l-2 border-gray-100 pl-4">
          {children.map((child) => (
            <CommentItem
              key={child.id}
              threadId={threadId}
              comment={child}
              tree={tree}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        title="¿Borrar este comentario?"
        description={
          children.length > 0
            ? 'Las respuestas quedarán huérfanas pero visibles.'
            : 'Esta acción no se puede deshacer.'
        }
        confirmLabel={deleting ? 'Borrando…' : 'Sí, borrar'}
        confirmDisabled={deleting}
        onConfirm={handleDelete}
        variant="danger"
      />

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="comment"
        targetId={comment.id}
        threadId={threadId}
      />

      <SignInPromptDialog
        open={signInPrompt !== null}
        onClose={() => setSignInPrompt(null)}
        reason={signInPrompt ?? undefined}
      />
    </li>
  );
}
