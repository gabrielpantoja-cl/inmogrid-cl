'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChatBubbleOvalLeftIcon,
  HeartIcon,
  BookmarkIcon,
  ShareIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  BookmarkIcon as BookmarkSolidIcon,
} from '@heroicons/react/24/solid';
import { useAuth } from '@/shared/hooks/useAuth';
import { SignInPromptDialog } from './SignInPromptDialog';
import { ReportDialog } from './ReportDialog';

interface ThreadActionBarProps {
  threadId: string;
  slug: string;
  title: string;
  authorId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  initialBookmarked: boolean;
  commentCount: number;
  /** Callback opcional cuando se hace click en "Comentar" — el caller decide
   *  si abrir un composer inline (feed) o scrollear al composer del detalle. */
  onCommentClick?: () => void;
  /** En el detail del hilo el "Comentar" simplemente saltea al form, no
   *  abre composer adicional. La barra ofrece la opción de Reportar (no
   *  duplicada en el menú overflow). */
  variant?: 'feed' | 'detail';
  /** Si la barra es en el detail y queremos sticky al scroll. */
  sticky?: boolean;
}

export function ThreadActionBar({
  threadId,
  slug,
  title,
  authorId,
  initialLiked,
  initialLikeCount,
  initialBookmarked,
  commentCount,
  onCommentClick,
  variant = 'feed',
  sticky = false,
}: ThreadActionBarProps) {
  const { user, isAuthenticated } = useAuth();
  const isOwner = !!user && user.id === authorId;

  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [signInPrompt, setSignInPrompt] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shareTimer.current) clearTimeout(shareTimer.current);
    };
  }, []);

  const handleLike = async () => {
    if (!isAuthenticated) {
      setSignInPrompt('dejar tu me gusta');
      return;
    }
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));
    try {
      const res = await fetch(`/api/threads/${threadId}/like`, { method: 'POST' });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      setSignInPrompt('guardar este hilo');
      return;
    }
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      const res = await fetch(`/api/threads/${threadId}/bookmark`, { method: 'POST' });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      setBookmarked(data.bookmarked);
    } catch {
      setBookmarked(prev);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/foro/${slug}`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // cancel/unsupported → fallback a clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState('copied');
      if (shareTimer.current) clearTimeout(shareTimer.current);
      shareTimer.current = setTimeout(() => setShareState('idle'), 1800);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleComment = () => {
    if (!isAuthenticated) {
      setSignInPrompt('comentar');
      return;
    }
    if (onCommentClick) onCommentClick();
  };

  const handleReport = () => {
    if (!isAuthenticated) {
      setSignInPrompt('reportar este hilo');
      return;
    }
    setReportOpen(true);
  };

  const containerClass =
    variant === 'detail'
      ? `flex items-center gap-0.5 sm:gap-1 rounded-xl border border-gray-200 bg-white/95 backdrop-blur px-2 py-1.5 ${
          sticky ? 'sticky top-16 z-10 shadow-sm' : ''
        }`
      : 'flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 border-t border-gray-100 text-sm';

  return (
    <>
      <div className={containerClass}>
        <ActionButton
          icon={liked ? HeartSolidIcon : HeartIcon}
          label={liked ? 'Te gusta' : 'Me gusta'}
          count={likeCount}
          active={liked}
          activeClassName="text-rose-600"
          onClick={handleLike}
        />
        <ActionButton
          icon={ChatBubbleOvalLeftIcon}
          label="Comentar"
          count={commentCount}
          onClick={handleComment}
        />
        <ActionButton
          icon={bookmarked ? BookmarkSolidIcon : BookmarkIcon}
          label={bookmarked ? 'Guardado' : 'Guardar'}
          active={bookmarked}
          activeClassName="text-amber-600"
          onClick={handleBookmark}
        />
        <ActionButton
          icon={ShareIcon}
          label={shareState === 'copied' ? '¡Copiado!' : 'Compartir'}
          active={shareState === 'copied'}
          activeClassName="text-emerald-600"
          onClick={handleShare}
        />
        {variant === 'detail' && !isOwner && (
          <ActionButton
            icon={FlagIcon}
            label="Reportar"
            onClick={handleReport}
          />
        )}
      </div>

      <SignInPromptDialog
        open={signInPrompt !== null}
        onClose={() => setSignInPrompt(null)}
        reason={signInPrompt ?? undefined}
        redirectTo={`/foro/${slug}`}
      />

      {variant === 'detail' && (
        <ReportDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="thread"
          targetId={threadId}
        />
      )}
    </>
  );
}

interface ActionButtonProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  count?: number;
  active?: boolean;
  activeClassName?: string;
  onClick: () => void;
}

function ActionButton({
  icon: Icon,
  label,
  count,
  active,
  activeClassName = 'text-primary',
  onClick,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 sm:px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? activeClassName
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-4 h-4" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="text-gray-500">{count}</span>
      )}
    </button>
  );
}
