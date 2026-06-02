'use client';

import { useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import type { ReportFilterStatus, ReportAction } from '@/features/forum';

// Shape serializado desde el server (ver page.tsx).
type Author = {
  id: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

type ReportItem = {
  id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  targetType: 'thread' | 'comment';
  targetId: string;
  createdAt: string;
  reviewedAt: string | null;
  reporter: Author | null;
  reviewer: { id: string; username: string | null; fullName: string | null } | null;
  target:
    | {
        kind: 'thread';
        id: string;
        slug: string;
        title: string;
        preview: string;
        status: string;
        createdAt: string;
        author: Author | null;
      }
    | {
        kind: 'comment';
        id: string;
        contentHtml: string;
        createdAt: string;
        thread: { id: string; slug: string; title: string } | null;
        author: Author | null;
      }
    | null;
};

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  offensive: 'Ofensivo',
  misleading: 'Engañoso',
  illegal: 'Ilegal',
  other: 'Otro',
};

const STATUS_LABELS: Record<ReportFilterStatus, string> = {
  pending: 'Pendientes',
  reviewed: 'Revisados',
  dismissed: 'Descartados',
  actioned: 'Con acción',
  all: 'Todos',
};

interface Props {
  initialReports: ReportItem[];
  initialStatus: ReportFilterStatus;
  pendingCount: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReportsAdminClient({
  initialReports,
  initialStatus,
  pendingCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [reports, setReports] = useState(initialReports);
  const [status, setStatus] = useState<ReportFilterStatus>(initialStatus);
  const [currentPending, setCurrentPending] = useState(pendingCount);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refetch = useCallback(
    async (nextStatus: ReportFilterStatus) => {
      const res = await fetch(`/api/admin/reports?status=${nextStatus}&limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      // Los objetos no se re-serializan desde el server component acá, así
      // que devolvemos el formato del endpoint (ya es plain objects con
      // Date→ISO via NextResponse.json).
      setReports(data.reports);
      setCurrentPending(data.pendingCount ?? 0);
    },
    [],
  );

  const handleTabChange = (next: ReportFilterStatus) => {
    if (next === status) return;
    setStatus(next);
    // Actualiza URL (sin scroll reset) para que F5 respete el tab activo.
    const params = new URLSearchParams();
    if (next !== 'pending') params.set('status', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    startTransition(() => {
      void refetch(next);
    });
  };

  const performAction = async (
    reportId: string,
    newStatus: 'reviewed' | 'dismissed' | 'actioned' | 'pending',
    action: ReportAction = null,
  ) => {
    setBusyId(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'No se pudo aplicar la acción');
        return;
      }
      // Refetch manteniendo el tab actual para ver el nuevo estado.
      await refetch(status);
    } catch {
      alert('Error de red. Intenta de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  const TABS: ReportFilterStatus[] = [
    'pending',
    'actioned',
    'dismissed',
    'reviewed',
    'all',
  ];

  return (
    <>
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Filtros de estado"
        className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto"
      >
        {TABS.map((tab) => {
          const active = status === tab;
          return (
            <button
              key={tab}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => handleTabChange(tab)}
              className={`relative whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {STATUS_LABELS[tab]}
              {tab === 'pending' && currentPending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold h-4 min-w-[16px] px-1">
                  {currentPending > 99 ? '99+' : currentPending}
                </span>
              )}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {isPending && (
        <p className="text-xs text-gray-400">Cargando…</p>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">
            {status === 'pending'
              ? 'No hay reportes pendientes de revisión.'
              : `No hay reportes en estado "${STATUS_LABELS[status].toLowerCase()}".`}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              busy={busyId === report.id}
              onAction={performAction}
            />
          ))}
        </ul>
      )}
    </>
  );
}

interface CardProps {
  report: ReportItem;
  busy: boolean;
  onAction: (
    reportId: string,
    newStatus: 'reviewed' | 'dismissed' | 'actioned' | 'pending',
    action?: ReportAction,
  ) => void | Promise<void>;
}

function ReportCard({ report, busy, onAction }: CardProps) {
  const { target } = report;
  const isThread = target?.kind === 'thread';
  const threadStatus = isThread ? target.status : null;
  const threadSlug = isThread
    ? target.slug
    : target?.kind === 'comment'
    ? target.thread?.slug
    : null;
  const threadTitle = isThread
    ? target.title
    : target?.kind === 'comment'
    ? target.thread?.title
    : null;

  const isAlreadyHidden = isThread && threadStatus === 'hidden';

  const reporterLabel =
    report.reporter?.fullName ||
    report.reporter?.username ||
    'Reportante eliminado';
  const authorLabel =
    target?.author?.fullName ||
    target?.author?.username ||
    'Autor eliminado';

  const statusChip = (() => {
    switch (report.status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'actioned':
        return 'bg-red-100 text-red-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-700';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
    }
  })();

  return (
    <li className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-medium ${statusChip}`}>
          {report.status}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
          {report.targetType === 'thread' ? 'hilo' : 'comentario'}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
          {REASON_LABELS[report.reason] ?? report.reason}
        </span>
        {isAlreadyHidden && (
          <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 font-medium">
            oculto
          </span>
        )}
        <span className="ml-auto text-gray-400">
          {formatDate(report.createdAt)}
        </span>
      </div>

      <div className="text-sm text-gray-600">
        Reportado por{' '}
        <span className="font-medium text-gray-800">{reporterLabel}</span>
        {report.reviewer && (
          <>
            {' · revisado por '}
            <span className="font-medium text-gray-800">
              {report.reviewer.fullName || report.reviewer.username || 'admin'}
            </span>
          </>
        )}
      </div>

      {report.details && (
        <blockquote className="border-l-2 border-gray-200 pl-3 text-sm text-gray-700 italic">
          “{report.details}”
        </blockquote>
      )}

      {/* Preview del target */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1.5">
        {target === null ? (
          <p className="text-sm text-gray-400 italic">
            Contenido eliminado o no encontrado.
          </p>
        ) : isThread ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                {target.title}
              </h3>
              {threadSlug && (
                <Link
                  href={`/foro/${threadSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  ver original ↗
                </Link>
              )}
            </div>
            <p className="text-xs text-gray-500">por {authorLabel}</p>
            <p className="text-sm text-gray-700 line-clamp-3">
              {target.preview || 'Sin vista previa'}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                en hilo:{' '}
                <span className="font-medium text-gray-800 line-clamp-1">
                  {threadTitle ?? 'Hilo eliminado'}
                </span>
              </p>
              {threadSlug && (
                <Link
                  href={`/foro/${threadSlug}#comment-${target.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  ver original ↗
                </Link>
              )}
            </div>
            <p className="text-xs text-gray-500">por {authorLabel}</p>
            <div
              className="prose prose-sm max-w-none text-gray-700 line-clamp-4"
              dangerouslySetInnerHTML={{ __html: target.contentHtml }}
            />
          </>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-2 pt-1">
        {report.status === 'pending' ? (
          <>
            {isThread && !isAlreadyHidden && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onAction(report.id, 'actioned', 'hide_thread')
                }
                className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 px-3 py-1.5 text-sm font-medium text-white"
              >
                Ocultar hilo
              </button>
            )}
            {isThread && isAlreadyHidden && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onAction(report.id, 'actioned', 'restore_thread')
                }
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-1.5 text-sm font-medium text-white"
              >
                Restaurar hilo
              </button>
            )}
            {!isThread && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  onAction(report.id, 'actioned', 'delete_comment')
                }
                className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 px-3 py-1.5 text-sm font-medium text-white"
              >
                Borrar comentario
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(report.id, 'dismissed')}
              className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60 px-3 py-1.5 text-sm font-medium text-gray-700"
            >
              Descartar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(report.id, 'reviewed')}
              className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60 px-3 py-1.5 text-sm font-medium text-gray-700"
            >
              Marcar revisado
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(report.id, 'pending')}
            className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60 px-3 py-1.5 text-sm font-medium text-gray-700"
          >
            Reabrir
          </button>
        )}
      </div>
    </li>
  );
}
