import type { Metadata } from 'next';
import { requireAdmin } from '@/shared/lib/supabase/auth';
import { listReports, type ReportFilterStatus } from '@/features/forum';
import { ReportsAdminClient } from './ReportsAdminClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Moderación · Reportes',
  description:
    'Panel administrativo para revisar reportes de contenido del foro.',
  robots: { index: false, follow: false },
};

const VALID: ReportFilterStatus[] = [
  'pending',
  'reviewed',
  'dismissed',
  'actioned',
  'all',
];

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function ReportsAdminPage({ searchParams }: Props) {
  await requireAdmin();
  const { status: rawStatus } = await searchParams;
  const initialStatus: ReportFilterStatus =
    rawStatus && VALID.includes(rawStatus as ReportFilterStatus)
      ? (rawStatus as ReportFilterStatus)
      : 'pending';

  const { reports, pendingCount } = await listReports({
    status: initialStatus,
    limit: 50,
  });

  // Serializamos a tipos plain — evitamos pasar Date directo al client.
  // Usamos el discriminator `targetType` + narrow de TypeScript para preservar
  // el tipado sin casts a `unknown` (que romperían la inferencia del client).
  const serializable = reports.map((r) => {
    const base = {
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      targetType: r.targetType,
      targetId: r.targetId,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      reporter: r.reporter,
      reviewer: r.reviewer,
    };

    if (!r.target) {
      return { ...base, target: null };
    }

    if (r.targetType === 'thread' && 'slug' in r.target) {
      return {
        ...base,
        target: {
          kind: 'thread' as const,
          id: r.target.id,
          slug: r.target.slug,
          title: r.target.title,
          preview: (r.target.contentText ?? '').slice(0, 300),
          status: r.target.status,
          createdAt: r.target.createdAt.toISOString(),
          author: r.target.author,
        },
      };
    }

    if (r.targetType === 'comment' && 'contentHtml' in r.target) {
      return {
        ...base,
        target: {
          kind: 'comment' as const,
          id: r.target.id,
          contentHtml: r.target.contentHtml,
          createdAt: r.target.createdAt.toISOString(),
          thread: r.target.thread,
          author: r.target.author,
        },
      };
    }

    return { ...base, target: null };
  });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Moderación de reportes</h1>
        <p className="text-sm text-gray-600 mt-1">
          Reportes de hilos y comentarios del foro. Los usuarios autenticados
          pueden reportar contenido; acá lo revisas y decides.
        </p>
      </header>

      <ReportsAdminClient
        initialReports={serializable}
        initialStatus={initialStatus}
        pendingCount={pendingCount}
      />
    </div>
  );
}
