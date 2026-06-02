import { Suspense } from 'react';
import { requireProfessionalProfile } from '@/shared/lib/supabase/auth';
import TablaContent from './TablaContent';

export const metadata = {
  title: 'Tabla · Referenciales',
  description:
    'Vista de tabla estilo planilla para transacciones inmobiliarias verificadas — buscador, filtros combinables reflejados en la URL, 30 registros por página.',
};

/**
 * Esta ruta requiere un perfil profesional completo — es una vista premium
 * para peritos, tasadores y corredores. El gating vive en
 * requireProfessionalProfile() (auth.ts). Si el usuario no tiene
 * `profession` seteado, se redirige a /perfil?complete=professional.
 */
export default async function TablaPage() {
  await requireProfessionalProfile();

  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-gray-500">
          Cargando tabla…
        </div>
      }
    >
      <TablaContent />
    </Suspense>
  );
}
