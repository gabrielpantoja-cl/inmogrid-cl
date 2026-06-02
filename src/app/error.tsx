'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error Boundary para el root de la aplicación
 *
 * Este componente captura errores en cualquier parte de la aplicación
 * que no esté cubierta por error boundaries más específicos.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log del error a servicio de monitoreo (ej: Sentry, LogRocket)
    console.error('🚨 [APP_ERROR]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrar con servicio de error reporting
    // Ejemplo: Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
          <div className="max-w-2xl w-full space-y-8 text-center">
            {/* Icono de error */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Título */}
            <h1 className="text-3xl font-bold text-gray-900">
              Algo salió mal
            </h1>

            {/* Descripción */}
            <div className="space-y-4">
              <p className="text-lg text-gray-600">
                Lo sentimos, ha ocurrido un error inesperado.
              </p>

              {/* Mostrar información del error solo en desarrollo */}
              {process.env.NODE_ENV === 'development' && error.message && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <p className="text-sm font-mono text-red-800 break-all">
                    {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-xs text-red-600 mt-2">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg"
              >
                Intentar de nuevo
              </button>

              <Link
                href="/"
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium shadow-lg"
              >
                Volver al inicio
              </Link>
            </div>

            {/* Información adicional */}
            <div className="pt-8 text-sm text-gray-500">
              <p>
                Si el problema persiste, por favor escríbenos a{' '}
                <a
                  href="mailto:hola@inmogrid.cl"
                  className="text-primary underline hover:text-primary/80"
                >
                  hola@inmogrid.cl
                </a>
                .
              </p>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
