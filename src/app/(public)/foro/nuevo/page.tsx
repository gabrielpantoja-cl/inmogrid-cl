import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/shared/lib/auth';
import { NewThreadForm } from './NewThreadForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nuevo hilo · inmogrid',
  description: 'Publicar un nuevo hilo en el foro de inmogrid.',
};

export default async function NewThreadPage() {
  const user = await auth();
  if (!user?.id) {
    redirect('/auth/login?next=/foro/nuevo');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva publicación</h1>
        <p className="text-sm text-gray-600 mt-1">
          Comparte una pregunta, una reflexión o un aporte con la comunidad.
        </p>
      </header>
      <NewThreadForm />
    </div>
  );
}
