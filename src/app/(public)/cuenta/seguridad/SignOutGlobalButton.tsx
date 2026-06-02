'use client';

import { useState } from 'react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { createClient } from '@/shared/lib/supabase/client';

/**
 * Cierra sesión en TODOS los dispositivos invocando el endpoint server-side
 * que llama a `supabase.auth.signOut({ scope: 'global' })`. Eso revoca
 * todos los refresh tokens del usuario en Supabase Auth.
 *
 * Flujo:
 *   1. Click → expand confirmación inline (no modal — es menos intrusivo
 *      pero suficiente para frenar clicks accidentales).
 *   2. Confirmar → POST /api/auth/sign-out-global.
 *   3. Limpiar cookies del browser actual con signOut local (defensa en
 *      profundidad: el endpoint server ya intenta limpiarlas pero el SDK
 *      del client lo hace de forma más robusta).
 *   4. Hard redirect a /.
 */
export function SignOutGlobalButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    const toastId = toast.loading('Cerrando todas las sesiones…');

    try {
      const res = await fetch('/api/auth/sign-out-global', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }

      // Defensa en profundidad: aunque el server ya invalidó el refresh
      // token, llamamos al signOut local del SDK para asegurar que las
      // cookies de este browser se limpien antes del redirect. Timeout
      // 500ms igual que en useAuth.signOut (mismo razonamiento).
      const supabase = createClient();
      await Promise.race([
        supabase.auth.signOut({ scope: 'local' }),
        new Promise<void>((resolve) => setTimeout(resolve, 500)),
      ]);

      toast.success('Sesiones cerradas. Redirigiendo…', { id: toastId, duration: 1500 });
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err) {
      console.error('[SignOutGlobalButton]', err);
      toast.error(err instanceof Error ? err.message : 'Error al cerrar sesiones', {
        id: toastId,
      });
      setIsPending(false);
    }
  };

  return (
    <section className="rounded-xl border border-orange-200 bg-orange-50/60">
      <header className="flex items-start gap-3 border-b border-orange-200 px-5 py-4">
        <ShieldExclamationIcon className="h-5 w-5 shrink-0 text-orange-600 mt-0.5" />
        <div>
          <h3 className="font-semibold text-orange-900">Cerrar sesión en todos los dispositivos</h3>
          <p className="mt-1 text-sm text-orange-800">
            Útil si perdiste un dispositivo, sospechas que alguien accedió a tu
            cuenta, o simplemente quieres deslogearte de todos los navegadores
            donde te hayas autenticado.
          </p>
        </div>
      </header>

      <div className="p-5">
        {!isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="rounded-lg border border-orange-400 bg-white px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100"
          >
            Cerrar sesión en todos los dispositivos
          </button>
        )}

        {isExpanded && (
          <div className="space-y-3">
            <p className="text-sm text-orange-900">
              <strong>¿Estás seguro?</strong> Tendrás que volver a iniciar sesión
              en cada dispositivo donde uses inmogrid.cl. Esta acción afecta
              también a esta sesión actual.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {isPending ? 'Cerrando…' : 'Sí, cerrar todas mis sesiones'}
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                disabled={isPending}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
