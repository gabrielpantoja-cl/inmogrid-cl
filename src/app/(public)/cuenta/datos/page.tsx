import { requireAuth } from '@/shared/lib/supabase/auth';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { DangerZone } from '@/features/profiles';

export default async function DatosPage() {
  const authUser = await requireAuth();

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Mis datos</h2>
        <p className="mt-1 text-sm text-gray-600">
          Acceso, descarga y eliminación de los datos personales asociados a tu
          cuenta. Estas opciones honran la{' '}
          <a
            href="https://www.bcn.cl/leychile/navegar?idNorma=141599"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Ley 19.628
          </a>{' '}
          (protección de datos personales en Chile).
        </p>
      </div>

      {/* Exportar — placeholder. Implementación pendiente: query que junte
          profile + posts + threads + comments + contributions + audit_logs
          y devuelva un JSON descargable. Lo dejo como botón disabled para
          no scope-creep ahora pero reservar el espacio en la UI. */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <ArrowDownTrayIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Exportar mis datos</h3>
            <p className="mt-1 text-sm text-gray-600">
              Descarga una copia de todo lo que inmogrid.cl tiene sobre ti:
              perfil, contribuciones, hilos, comentarios y registro de
              actividad. La descarga se entregará como un archivo JSON.
            </p>
            <button
              type="button"
              disabled
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Próximamente
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Mientras tanto, si necesitas una copia de tus datos, escríbenos a{' '}
              <a
                href="mailto:hola@inmogrid.cl"
                className="text-primary hover:underline"
              >
                hola@inmogrid.cl
              </a>{' '}
              y lo procesamos manualmente dentro de las 48 horas.
            </p>
          </div>
        </div>
      </div>

      {authUser.email && <DangerZone userEmail={authUser.email} />}
    </section>
  );
}
