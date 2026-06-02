import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/shared/lib/auth';
import { getThreadBySlug } from '@/features/forum';
import { getProfile, isAdminRole } from '@/shared/lib/supabase/auth';
import { EditThreadForm } from './EditThreadForm';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Editar hilo',
  description: 'Editar un hilo del foro de inmogrid.',
  robots: { index: false, follow: false },
};

export default async function EditThreadPage({ params }: Props) {
  const { slug } = await params;
  const user = await auth();
  if (!user?.id) {
    redirect(`/auth/login?next=/foro/${slug}/editar`);
  }

  const thread = await getThreadBySlug(slug);
  if (!thread) notFound();

  // Solo el autor o un admin puede entrar acá.
  if (thread.author?.id !== user.id) {
    const profile = await getProfile(user.id);
    if (!isAdminRole(profile?.role)) {
      redirect(`/foro/${slug}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editar hilo</h1>
        <p className="text-sm text-gray-600 mt-1">
          Puedes actualizar título, contenido y etiquetas. La fecha de edición
          queda registrada y visible para otros usuarios.
        </p>
      </header>
      <EditThreadForm
        threadId={thread.id}
        slug={thread.slug}
        initial={{
          title: thread.title,
          contentHtml: thread.contentHtml,
          tags: thread.tags,
        }}
      />
    </div>
  );
}
