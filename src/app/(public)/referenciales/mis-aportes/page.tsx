import { requireAuth } from '@/shared/lib/supabase/auth';
import ContribucionesContent from './ContribucionesContent';

export const metadata = {
  title: 'Mis aportes · Referenciales',
  description:
    'Histórico de referenciales y reportes que has enviado a la comunidad.',
};

export default async function MisAportesPage() {
  // requireAuth explícito — antes venía del layout.tsx de dashboard que
  // ya no existe. Usuarios anónimos caen a /auth/login.
  await requireAuth();
  return <ContribucionesContent />;
}
