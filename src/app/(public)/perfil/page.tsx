// Página de edición de perfil del usuario
// Ruta: /perfil (autenticado)

import Link from 'next/link';
import { requireAuth } from '@/shared/lib/supabase/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/shared/lib/prisma';
import { ProfileEditForm } from '@/features/profiles';

export const metadata = {
  title: 'Editar perfil',
  description: 'Edita tu perfil y personaliza tu presencia en inmogrid.cl',
};

type SearchParams = { complete?: string; welcome?: string };

export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await requireAuth();
  const sp = await searchParams;
  const needsProfessionalBanner = sp.complete === 'professional';
  // Primer login post-OAuth → /auth/callback nos manda acá con welcome=1
  // para que el usuario complete su perfil antes de sumergirse en el foro.
  const isWelcome = sp.welcome === '1';

  const profile = await prisma.profile.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      username: true,
      bio: true,
      tagline: true,
      coverImageUrl: true,
      location: true,
      identityTags: true,
      profession: true,
      company: true,
      phone: true,
      contactEmail: true,
      region: true,
      commune: true,
      address: true,
      website: true,
      linkedin: true,
      isPublicProfile: true,
      externalLinks: true,
      createdAt: true,
    },
  });

  if (!profile) {
    redirect('/auth/login');
  }

  // Nombre para saludo personalizado. El fullName viene del OAuth de Google
  // (user_metadata.full_name). Si por algún motivo faltara, caemos al
  // primer nombre del email antes del @.
  const greetingName = isWelcome
    ? (profile.fullName?.split(' ')[0] ?? authUser.email?.split('@')[0] ?? 'te')
    : null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isWelcome ? `¡Hola, ${greetingName}! 👋` : 'Editar mi perfil'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isWelcome
            ? 'Bienvenido a inmogrid.cl. Antes de sumergirte en el foro, completa los datos de tu perfil para que la comunidad te conozca. Puedes volver a editarlos cuando quieras.'
            : 'Personaliza tu perfil y define cómo te ven los demás en inmogrid.cl'}
        </p>
      </div>

      {isWelcome && (
        <div className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <strong className="block font-semibold">
            Tu cuenta ya está lista
          </strong>
          <p className="mt-1">
            Te generamos un <strong>username</strong> y tomamos tu nombre y foto
            desde Google. Revisa los datos abajo, agrega tu profesión y una
            pequeña bio si quieres. Todo es opcional — puedes ir al{' '}
            <Link href="/" className="font-semibold underline hover:no-underline">
              foro
            </Link>{' '}
            cuando quieras.
          </p>
        </div>
      )}

      {needsProfessionalBanner && !isWelcome && (
        <div className="mb-6 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-gray-900">
          <strong className="block font-semibold">
            Completa tu perfil profesional
          </strong>
          <p className="mt-1">
            Para acceder a la vista <strong>Tabla</strong> de referenciales
            (funcionalidad premium para peritos y tasadores) necesitas indicar
            tu profesión. Selecciona una opción en el campo{' '}
            <em>Profesión</em> y guarda los cambios.
          </p>
        </div>
      )}

      <ProfileEditForm user={profile} />

      {/* Punto de acceso a operaciones de cuenta (eliminar, exportar,
          seguridad, privacidad). Antes la DangerZone vivía acá al final
          del form — se movió a /cuenta/datos para no mezclar "cómo me
          presento" con "operaciones de mi cuenta". */}
      <div className="mt-12 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-700">
        <strong className="block text-gray-900">¿Buscas configuración de cuenta?</strong>
        <p className="mt-1">
          Para gestionar tu privacidad, sesiones, exportar tus datos o eliminar
          tu cuenta, ve a{' '}
          <Link href="/cuenta" className="font-medium text-primary hover:underline">
            Configuración de cuenta
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
