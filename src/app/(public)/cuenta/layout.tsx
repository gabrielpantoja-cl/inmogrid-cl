import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireAuth } from '@/shared/lib/supabase/auth';
import { CuentaSidebarNav } from './CuentaSidebarNav';

export const metadata = {
  title: 'Configuración de cuenta',
  description: 'Gestiona tu cuenta, seguridad y privacidad en inmogrid.cl',
};

/**
 * Layout para `/cuenta/*`. Auth gate al nivel de layout: una sola llamada
 * a `requireAuth()` cubre todas las sub-rutas, así no replicamos el check
 * en cada `page.tsx`. Si más adelante alguna sub-ruta necesita un gate más
 * estricto (ej. admin-only), se agrega encima de éste.
 */
export default async function CuentaLayout({ children }: { children: ReactNode }) {
  await requireAuth();

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuración de cuenta</h1>
        <p className="mt-1 text-gray-600">
          Tu cuenta es distinta de tu{' '}
          <Link href="/perfil" className="text-primary hover:underline">
            perfil público
          </Link>
          . Acá controlas la seguridad, privacidad y datos de tu cuenta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
        <CuentaSidebarNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
