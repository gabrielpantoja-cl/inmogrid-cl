'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@/shared/hooks/useAuth';

interface Notification {
  id: string;
  type: 'mention' | 'reply' | 'comment_on_thread';
  createdAt: string;
  readAt: string | null;
  actor: {
    id: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  thread: {
    id: string;
    slug: string;
    title: string;
  };
  commentId: string | null;
}

// Polling cada 60s — no realtime por ahora, pero suficiente para una
// experiencia "casi viva" sin overhead de websockets. Cuando el user esté
// activo en la página, el bell se refresca; si está afuera, no gastamos.
const POLL_INTERVAL_MS = 60_000;

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'ahora';
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

function describeNotification(n: Notification): string {
  const actor = n.actor?.fullName || n.actor?.username || 'Alguien';
  switch (n.type) {
    case 'mention':
      return `${actor} te mencionó en "${n.thread.title}"`;
    case 'reply':
      return `${actor} respondió tu comentario en "${n.thread.title}"`;
    case 'comment_on_thread':
      return `${actor} comentó en tu hilo "${n.thread.title}"`;
    default:
      return `${actor} · ${n.thread.title}`;
  }
}

function hrefForNotification(n: Notification): string {
  const anchor = n.commentId ? `#comment-${n.commentId}` : '';
  return `/foro/${n.thread.slug}${anchor}`;
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=15', {
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silently fail — el bell no es crítico.
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
    } catch {
      // silent
    }
  };

  const handleNotifClick = async (n: Notification) => {
    setOpen(false);
    if (!n.readAt) {
      // Optimistic — marca localmente, luego sincroniza con server.
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [n.id] }),
        });
      } catch {
        // silent
      }
    }
  };

  if (!isAuthenticated) return null;

  const Icon = unreadCount > 0 ? BellAlertIcon : BellIcon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void fetchNotifications();
        }}
        aria-label={
          unreadCount > 0
            ? `Notificaciones (${unreadCount} sin leer)`
            : 'Notificaciones'
        }
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <Icon
          className={`w-5 h-5 ${unreadCount > 0 ? 'text-primary' : ''}`}
          aria-hidden
        />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-primary hover:underline"
              >
                Marcar todo leído
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">
                Cargando…
              </p>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-500">
                No tienes notificaciones todavía.
              </p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={hrefForNotification(n)}
                      onClick={() => handleNotifClick(n)}
                      className={`flex items-start gap-3 px-3 py-2.5 transition-colors ${
                        n.readAt
                          ? 'hover:bg-gray-50'
                          : 'bg-primary/5 hover:bg-primary/10'
                      }`}
                    >
                      {n.actor?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={n.actor.avatarUrl}
                          alt=""
                          className="w-8 h-8 rounded-full shrink-0"
                        />
                      ) : (
                        <span
                          className="w-8 h-8 rounded-full bg-gray-200 shrink-0"
                          aria-hidden
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {describeNotification(n)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>
                      {!n.readAt && (
                        <span
                          className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0"
                          aria-label="No leído"
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
