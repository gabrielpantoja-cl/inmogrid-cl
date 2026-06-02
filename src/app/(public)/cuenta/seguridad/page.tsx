import { requireAuth } from '@/shared/lib/supabase/auth';
import { prisma } from '@/shared/lib/prisma';
import { SignOutGlobalButton } from './SignOutGlobalButton';

const formatRelative = (date: Date) => {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'hace instantes';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} día${days !== 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months !== 1 ? 'es' : ''}`;
  const years = Math.floor(days / 365);
  return `hace ${years} año${years !== 1 ? 's' : ''}`;
};

const formatAbsolute = (date: Date) =>
  date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Heurística simple para identificar el dispositivo desde el user-agent.
 * No pretende ser parser completo — solo etiquetas legibles para el
 * usuario. Para un parser robusto está `ua-parser-js`, pero agregar la
 * dependencia para esto sería sobreingeniería.
 */
function describeUserAgent(ua: string | null): string {
  if (!ua) return 'Dispositivo desconocido';
  const isMobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !/Android/i.test(ua);
  const isChrome = /Chrome\//i.test(ua) && !/Edg\//i.test(ua);
  const isSafari = /Safari\//i.test(ua) && !/Chrome\//i.test(ua);
  const isFirefox = /Firefox\//i.test(ua);
  const isEdge = /Edg\//i.test(ua);

  const browser = isEdge
    ? 'Edge'
    : isChrome
    ? 'Chrome'
    : isFirefox
    ? 'Firefox'
    : isSafari
    ? 'Safari'
    : 'Navegador';

  const os = isMobile
    ? /Android/i.test(ua)
      ? 'Android'
      : 'iOS'
    : isMac
    ? 'macOS'
    : isWindows
    ? 'Windows'
    : isLinux
    ? 'Linux'
    : '';

  return os ? `${browser} en ${os}` : browser;
}

export default async function SeguridadPage() {
  const authUser = await requireAuth();

  // Últimos 10 logins de este usuario.
  const logins = await prisma.auditLog.findMany({
    where: { userId: authUser.id, action: 'auth.login' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, createdAt: true, metadata: true },
  });

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Seguridad</h2>
        <p className="mt-1 text-sm text-gray-600">
          Gestiona tus sesiones activas y revisa el historial de inicios de
          sesión.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">Duración de sesión</h3>
        <p className="mt-1 text-sm text-gray-600">
          Tu sesión se mantiene activa indefinidamente mientras uses inmogrid.cl.
          El token de acceso se renueva automáticamente cada hora y solo
          necesitas volver a iniciar sesión si pasas mucho tiempo sin entrar.
        </p>
      </div>

      <SignOutGlobalButton />

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Inicios de sesión recientes</h3>
        {logins.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500">
            No hay inicios de sesión registrados todavía. El historial empezó a
            registrarse el 28 de abril de 2026.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Cuándo</th>
                  <th className="px-4 py-2 text-left font-medium">Dispositivo</th>
                  <th className="px-4 py-2 text-left font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logins.map((log, i) => {
                  const meta = (log.metadata as Record<string, unknown> | null) ?? {};
                  const userAgent = typeof meta.userAgent === 'string' ? meta.userAgent : null;
                  const ip = typeof meta.ip === 'string' ? meta.ip : null;

                  return (
                    <tr key={log.id} className={i === 0 ? 'bg-green-50/40' : ''}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {formatRelative(log.createdAt)}
                          {i === 0 && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                              Más reciente
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 tabular-nums">
                          {formatAbsolute(log.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {describeUserAgent(userAgent)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {ip ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Si ves un inicio de sesión que no reconoces, cierra todas las
          sesiones con el botón de arriba y considera cambiar la contraseña de
          tu cuenta de Google.
        </p>
      </div>
    </section>
  );
}
