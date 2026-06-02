import { getUser } from '@/shared/lib/supabase/auth';
import ReferencialesClient from './ReferencialesClient';

export const metadata = {
  title: 'Mapa de Transacciones Inmobiliarias · Chile',
  description:
    'Mapa público de transacciones inmobiliarias verificadas en Chile — datos abiertos con fuente CBR. Filtros, exportación CSV y contribuciones para usuarios autenticados.',
  alternates: { canonical: 'https://inmogrid.cl/referenciales' },
};

/**
 * Mapa unificado de referenciales — una sola ruta pública donde:
 *   - Usuario anónimo ve el mapa + filtros básicos (comuna, año).
 *     Si clickea "+ Contribuir" o intenta reportar, se abre el modal
 *     de login (permanece en la misma ruta al volver).
 *   - Usuario autenticado ve lo anterior + filtros avanzados (fechas,
 *     rangos, búsqueda, bbox), export CSV y acciones activas.
 *
 * El server component solo resuelve si hay sesión (`getUser()`) y pasa
 * el flag al client — toda la UI diferencial vive en `ReferencialesClient`
 * y `ReferencialesExplorer`.
 */
export default async function ReferencialesPage() {
  const user = await getUser();
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <ReferencialesClient isAuthenticated={user !== null} />
    </main>
  );
}
