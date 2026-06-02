import Link from 'next/link';
import { requireAuth } from '@/shared/lib/supabase/auth';
import { prisma } from '@/shared/lib/prisma';

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export default async function CuentaGeneralPage() {
  const authUser = await requireAuth();

  const profile = await prisma.profile.findUnique({
    where: { id: authUser.id },
    select: {
      username: true,
      fullName: true,
      createdAt: true,
      role: true,
    },
  });

  // El provider de OAuth viene del JWT de Supabase, no del row de profile.
  // app_metadata.provider es 'google' (único provider habilitado hoy).
  const provider = authUser.app_metadata?.provider ?? 'google';

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">General</h2>
        <p className="mt-1 text-sm text-gray-600">
          Información básica de tu cuenta. Para editar tu nombre, foto, bio o
          datos profesionales (lo que ven otros), ve a{' '}
          <Link href="/perfil" className="text-primary hover:underline">
            Editar perfil
          </Link>
          .
        </p>
      </div>

      <dl className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-5 py-4">
          <dt className="text-sm font-medium text-gray-500">Email</dt>
          <dd className="sm:col-span-2 text-sm text-gray-900 font-mono">
            {authUser.email}
          </dd>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-5 py-4">
          <dt className="text-sm font-medium text-gray-500">Proveedor</dt>
          <dd className="sm:col-span-2 text-sm text-gray-900 capitalize flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-5 h-5 rounded bg-white border border-gray-200 text-xs font-bold"
            >
              G
            </span>
            {provider} OAuth
          </dd>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-5 py-4">
          <dt className="text-sm font-medium text-gray-500">Username</dt>
          <dd className="sm:col-span-2 text-sm text-gray-900 font-mono">
            @{profile?.username ?? '—'}
          </dd>
        </div>
        {profile?.fullName && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-5 py-4">
            <dt className="text-sm font-medium text-gray-500">Nombre</dt>
            <dd className="sm:col-span-2 text-sm text-gray-900">{profile.fullName}</dd>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-5 py-4">
          <dt className="text-sm font-medium text-gray-500">Cuenta creada</dt>
          <dd className="sm:col-span-2 text-sm text-gray-900">
            {profile?.createdAt ? formatDate(profile.createdAt) : '—'}
          </dd>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-5 py-4">
          <dt className="text-sm font-medium text-gray-500">Rol</dt>
          <dd className="sm:col-span-2 text-sm text-gray-900 capitalize">
            {profile?.role ?? 'user'}
          </dd>
        </div>
      </dl>

      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-900">
        <strong className="block mb-1">¿Por qué no puedo editar mi email?</strong>
        Tu email viene de tu cuenta de Google. Para cambiarlo, modifica el email
        de tu cuenta de Google y vuelve a iniciar sesión, o crea una nueva cuenta.
      </div>
    </section>
  );
}
