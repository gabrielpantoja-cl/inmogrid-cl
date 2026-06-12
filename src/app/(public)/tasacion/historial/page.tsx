import { requireAuth } from '@/shared/lib/supabase/auth';
import HistorialTasacionesClient from './HistorialTasacionesClient';

export const metadata = {
  title: 'Mis tasaciones · inmogrid.cl',
  description: 'Historial de tasaciones gratuitas realizadas en inmogrid.cl.',
};

export default async function HistorialTasacionesPage() {
  await requireAuth();
  return <HistorialTasacionesClient />;
}
