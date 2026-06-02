import { notFound } from 'next/navigation';

// Documentación interna deshabilitada en producción.
// Para reactivar: descomentar el bloque de abajo, eliminar el `notFound()` y
// también restaurar el link "Documentación" en
// `src/shared/components/layout/common/account-menu/AccountMenu.tsx`
// y el route handler en `src/app/api/docs/[...path]/route.ts`.
export default function DocumentacionPage() {
  notFound();
}

/*
import { DocsViewer } from '@/features/docs/components/DocsViewer';
import { getUser, getProfile } from '@/shared/lib/supabase/auth';
import { redirect } from 'next/navigation';

export default async function DocumentacionPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const profile = await getProfile(user.id);

  // Proteger la ruta solo para administradores
  if (!profile || profile.role !== 'admin') {
    redirect('/?error=admin_required');
  }

  // Si es admin, renderizar la documentación
  return <DocsViewer />;
}
*/
