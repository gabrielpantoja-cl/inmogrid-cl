'use client';

import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { createClient } from '@/shared/lib/supabase/client';

interface DangerZoneProps {
  /**
   * Email del usuario autenticado. El usuario debe escribirlo exactamente
   * en el input de confirmación para habilitar el botón de eliminación —
   * patrón GitHub-style para una acción irreversible.
   */
  userEmail: string;
}

/**
 * Zona de peligro del perfil de usuario. Muestra una card roja con la
 * acción destructiva de eliminación de cuenta, protegida por:
 *
 *  1. Un botón inicial que NO dispara la acción — solo despliega el
 *     formulario de confirmación.
 *  2. Un input de texto donde el usuario debe escribir su email exacto.
 *  3. El botón "Eliminar mi cuenta para siempre" queda **deshabilitado**
 *     hasta que el input matchee carácter por carácter.
 *  4. Al confirmar, llama a `DELETE /api/delete-account` con el email en
 *     el body y hace hard redirect a `/` después del éxito.
 *
 * Se monta al final de `/perfil` (ver `src/app/(public)/perfil/page.tsx`).
 * No hay otros puntos de entrada en la app — el dropdown del AccountMenu
 * fue limpiado para que esta acción requiera intención explícita.
 */
export function DangerZone({ userEmail }: DangerZoneProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const canSubmit = confirmationInput === userEmail && !isDeleting;

  const handleDelete = async () => {
    if (!canSubmit) return;

    setIsDeleting(true);
    const toastId = toast.loading('Eliminando tu cuenta...');

    try {
      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmationInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? 'Error al eliminar la cuenta');
      }

      toast.success(
        'Tu cuenta fue eliminada. Redirigiendo...',
        { id: toastId, duration: 2000 }
      );

      // Cerrar la sesión del cliente ANTES del redirect. El DELETE borró
      // `auth.users` server-side, pero el SDK del browser sigue con el JWT
      // cacheado en localStorage — sin este `signOut` el `useAuth` hook
      // reanimaría el email del usuario via `getSession()` (que decodifica
      // el JWT local sin validar contra el server). `scope: 'local'` evita
      // pegarle a /auth/v1/logout (sesión ya inválida, colgaría).
      // Timeout 500ms: si el SDK se cuelga, forzamos redirect igual.
      const supabase = createClient();
      try {
        await Promise.race([
          supabase.auth.signOut({ scope: 'local' }),
          new Promise<void>((resolve) => setTimeout(resolve, 500)),
        ]);
      } catch (signOutError) {
        console.error('[DangerZone] signOut after delete failed:', signOutError);
      }

      // Hard reload a la landing con ?farewell=1 para el mensaje de
      // despedida. El middleware limpia cookies huérfanas por si quedara
      // algo stale (defensa en profundidad).
      setTimeout(() => {
        window.location.href = '/?farewell=1';
      }, 1000);
    } catch (error) {
      console.error('[DangerZone] Delete failed:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la cuenta. Intenta de nuevo más tarde.',
        { id: toastId }
      );
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setConfirmationInput('');
  };

  return (
    <section
      id="danger-zone"
      aria-labelledby="danger-zone-title"
      className="mt-12 rounded-xl border-2 border-red-300 bg-red-50/50"
    >
      <header className="flex items-start gap-3 border-b border-red-200 px-6 py-4">
        <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-red-600" aria-hidden="true" />
        <div>
          <h2 id="danger-zone-title" className="text-lg font-bold text-red-900">
            Eliminar mi cuenta
          </h2>
          <p className="mt-1 text-sm text-red-800">
            Lee con atención antes de continuar.
          </p>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-2xl">
          <p className="text-sm text-gray-700">
            Una vez eliminada, <strong>no hay forma de recuperarla</strong>. Se
            borrarán permanentemente:
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-0.5">
            <li>Tu perfil público y privado</li>
            <li>Tus hilos y comentarios del foro</li>
            <li>Tus publicaciones del blog (si eres admin)</li>
            <li>Tus likes, bookmarks y notificaciones</li>
            <li>Tus conexiones con otros profesionales</li>
            <li>Tu ficha profesional y cualquier evento que hayas creado</li>
            <li>Tu sesión de autenticación con Google</li>
          </ul>
          <p className="mt-3 text-sm text-gray-700">
            Puedes volver a crear una cuenta con el mismo email en cualquier
            momento, pero <strong>empezarás desde cero</strong>.
          </p>
        </div>

        {/* Pregunta + botón al final, después de la lectura. La intención es
            que el usuario llegue acá habiendo leído arriba, no que el botón
            esté visible como atajo. */}
        {!isExpanded && (
          <div className="mt-8 border-t border-red-200 pt-6">
            <p className="text-base font-semibold text-red-900">¿Estás seguro?</p>
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="mt-3 rounded-lg border border-red-400 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Eliminar mi cuenta
            </button>
          </div>
        )}

        {isExpanded && (
          <div className="mt-6 rounded-lg border border-red-300 bg-white p-5">
            <label
              htmlFor="delete-confirmation"
              className="block text-sm font-semibold text-gray-900"
            >
              Para confirmar, escribe tu email{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                {userEmail}
              </code>{' '}
              en el campo de abajo:
            </label>
            <input
              id="delete-confirmation"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={userEmail}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={isDeleting}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-gray-50"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canSubmit}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 sm:flex-none"
              >
                {isDeleting
                  ? 'Eliminando...'
                  : 'Eliminar mi cuenta para siempre'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isDeleting}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:flex-none"
              >
                Cancelar
              </button>
            </div>

            {confirmationInput.length > 0 && !canSubmit && !isDeleting && (
              <p className="mt-3 text-xs text-red-700">
                El texto no coincide. Debe ser exactamente{' '}
                <code className="font-mono">{userEmail}</code>.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
