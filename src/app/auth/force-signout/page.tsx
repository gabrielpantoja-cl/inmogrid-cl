'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/shared/lib/supabase/client';

/**
 * Página de rescate para sesiones zombie.
 *
 * Uso: si un usuario queda con cookies de Supabase válidas (criptográfi-
 * camente firmadas) pero su `auth.users.id` ya no existe en la base, la
 * UI queda desincronizada (navbar muestra email del JWT cacheado, server
 * component muestra "Inicia sesión"). El middleware intenta limpiar
 * estas cookies huérfanas automáticamente (ver `shared/lib/supabase/
 * middleware.ts`), pero si por alguna razón no alcanza, el usuario puede
 * navegar manualmente a `/auth/force-signout` y esta página:
 *
 * 1. Elimina **todas** las cookies `sb-*` del dominio, directamente vía
 *    `document.cookie` — no depende del SDK de Supabase ni de validación
 *    server-side.
 * 2. Limpia cualquier clave `sb-*` de `localStorage` y `sessionStorage`
 *    (el SDK de Supabase persiste tokens en localStorage por default).
 * 3. Llama `supabase.auth.signOut({scope:'local'})` como bonus — si el
 *    SDK hace algún cleanup extra, mejor. Si falla, no importa porque
 *    ya limpiamos a mano.
 * 4. Hard redirect a `/` para que el middleware corra con estado
 *    completamente limpio.
 *
 * El patrón es **idempotente** y **determinístico**: funciona incluso si
 * el user nunca estuvo autenticado (los document.cookie/localStorage
 * ops son no-op si no hay nada que limpiar).
 */
export default function ForceSignOutPage() {
  const [status, setStatus] = useState<'cleaning' | 'redirecting'>('cleaning');

  useEffect(() => {
    const cleanup = async () => {
      // 1. Borrar todas las cookies sb-* del dominio. Usamos document.cookie
      //    directamente porque es la forma más agresiva y no depende del
      //    SDK. Seteamos cada cookie con `expires` en el pasado para que
      //    el browser la elimine.
      if (typeof document !== 'undefined') {
        document.cookie.split(';').forEach((cookie) => {
          const name = cookie.trim().split('=')[0];
          if (name && name.startsWith('sb-')) {
            // Expirar en el path actual, root, y el subdominio www
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
          }
        });
      }

      // 2. Limpiar localStorage y sessionStorage de cualquier clave sb-*.
      //    El SDK de Supabase persiste el JWT en localStorage bajo una
      //    clave como `sb-<SUPABASE_PROJECT_REF>-auth-token`.
      if (typeof window !== 'undefined') {
        try {
          const localKeys = Object.keys(window.localStorage);
          localKeys
            .filter((k) => k.startsWith('sb-'))
            .forEach((k) => window.localStorage.removeItem(k));

          const sessionKeys = Object.keys(window.sessionStorage);
          sessionKeys
            .filter((k) => k.startsWith('sb-'))
            .forEach((k) => window.sessionStorage.removeItem(k));
        } catch {
          // Algunos browsers bloquean el acceso a storage en modo privado
          // — ignoramos porque nuestras cookies ya fueron limpiadas arriba.
        }
      }

      // 3. Llamar al signOut del SDK por si hace algún cleanup extra que
      //    nos perdimos (ej. index en IndexedDB). No bloqueamos si falla.
      try {
        const supabase = createClient();
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // No importa — el cleanup manual ya se hizo.
      }

      setStatus('redirecting');

      // 4. Hard reload a la landing. El middleware correrá con el browser
      //    limpio y no va a detectar ninguna cookie stale.
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    };

    cleanup();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-xl font-bold text-gray-900">
          {status === 'cleaning'
            ? 'Limpiando sesión…'
            : 'Redirigiendo al inicio…'}
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          {status === 'cleaning'
            ? 'Estamos limpiando las cookies y el almacenamiento local de tu navegador. Esto solo toma un instante.'
            : 'Listo. Te estamos llevando a la página principal.'}
        </p>
        <div className="mt-6">
          <div
            className="h-2 rounded-full bg-gray-100 overflow-hidden"
            aria-hidden="true"
          >
            <div className="h-full w-1/3 bg-primary animate-pulse" />
          </div>
        </div>
        <p className="mt-6 text-xs text-gray-500">
          Si la redirección no ocurre automáticamente,{' '}
          <Link href="/" className="text-primary underline">
            click aquí
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
