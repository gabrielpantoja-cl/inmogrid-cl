'use client';

import { useEffect, useState } from 'react';

// Banner que aparece tras borrar la cuenta (?farewell=1 en la URL).
// Se monta cliente-side porque necesita window.location y history.replaceState.
// Aislado para no bloquear el SSR del ThreadFeed principal.
export function FarewellBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('farewell') === '1') {
      setShow(true);
      params.delete('farewell');
      const qs = params.toString();
      const clean = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex items-start gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4"
    >
      <div className="flex-1">
        <h2 className="text-base font-semibold text-emerald-900">
          Gracias por haber sido parte de nuestra comunidad
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          Tu cuenta y tus datos fueron eliminados. La puerta siempre estará
          abierta para volver cuando quieras.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label="Cerrar mensaje"
        className="shrink-0 rounded-md p-1 text-emerald-700 transition-colors hover:bg-emerald-100 hover:text-emerald-900"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
