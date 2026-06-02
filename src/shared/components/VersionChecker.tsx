'use client';

import { useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const VERSION_ENDPOINT = '/api/public/version';

async function fetchSha(): Promise<string | null> {
  try {
    const res = await fetch(VERSION_ENDPOINT, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { sha?: string };
    return typeof data.sha === 'string' ? data.sha : null;
  } catch {
    return null;
  }
}

/**
 * Detecta nuevos deploys comparando el SHA actual vs el del primer mount.
 * Cuando detecta cambio, muestra una tarjeta fija abajo-derecha con opciones
 * "Actualizar" (reload) y "Ahora no" (descarta hasta próximo cambio).
 *
 * Estrategia:
 *   - En mount guarda el SHA inicial en un ref (no estado — no queremos
 *     re-renders por eso).
 *   - Poolea cada 5 min y on `window.focus` (cubre tabs que quedan en
 *     background y el usuario vuelve después de un deploy).
 *   - Si el usuario descarta, guardamos ese SHA en `dismissedSha` y no
 *     prompteamos hasta que llegue uno diferente. Al recargar se resetea,
 *     lo cual es el comportamiento deseado.
 *   - En dev el endpoint devuelve 'dev' siempre → nunca dispara.
 */
export default function VersionChecker() {
  const initialSha = useRef<string | null>(null);
  const dismissedSha = useRef<string | null>(null);
  const [latestSha, setLatestSha] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const latest = await fetchSha();
      if (cancelled || !latest) return;

      if (!initialSha.current) {
        initialSha.current = latest;
        return;
      }

      if (latest !== initialSha.current && latest !== dismissedSha.current) {
        setLatestSha(latest);
      }
    };

    check();
    const intervalId = setInterval(check, POLL_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (!latestSha) return null;

  const handleDismiss = () => {
    dismissedSha.current = latestSha;
    setLatestSha(null);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-4 w-4 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              Nueva versión disponible
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Hay cambios recientes en inmogrid.cl. Recarga para ver la última
              versión.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleReload}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
              >
                Actualizar
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:text-gray-900"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
