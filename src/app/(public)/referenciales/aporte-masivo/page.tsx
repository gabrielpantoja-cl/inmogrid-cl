import { requireAuth } from '@/shared/lib/supabase/auth';
import BulkContribuirClient from './BulkContribuirClient';

export const metadata = {
  title: 'Aporte masivo · Referenciales',
  description:
    'Carga múltiples referenciales como una planilla — pega desde Excel, valida en tiempo real y envía todo en bloque.',
};

export default async function AporteMasivoPage() {
  await requireAuth();
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <BulkContribuirClient />
    </main>
  );
}
