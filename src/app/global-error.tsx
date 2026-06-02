'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Global Error Boundary
 *
 * Este componente captura errores que ocurren en el root layout,
 * incluyendo errores durante la renderización del layout mismo.
 *
 * IMPORTANTE: Este componente DEBE incluir sus propias etiquetas <html> y <body>
 * porque reemplaza completamente el root layout cuando se activa.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log crítico del error global
    console.error('🔥 [GLOBAL_ERROR] Critical application error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    });

    // TODO: Integrar con servicio de error reporting crítico
    // Ejemplo: Sentry.captureException(error, { level: 'fatal' });
  }, [error]);

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error - inmogrid.cl</title>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            padding: 48px 32px;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
          }
          .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
            background: #fee;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon svg {
            width: 48px;
            height: 48px;
            color: #dc2626;
          }
          h1 {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 16px;
          }
          p {
            font-size: 16px;
            color: #6b7280;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .error-info {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 32px;
            text-align: left;
          }
          .error-message {
            font-family: monospace;
            font-size: 13px;
            color: #991b1b;
            word-break: break-all;
          }
          .error-id {
            font-size: 11px;
            color: #dc2626;
            margin-top: 8px;
          }
          .actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
          }
          button, a {
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s;
            border: none;
            display: inline-block;
          }
          .btn-primary {
            background: #667eea;
            color: white;
          }
          .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-1px);
          }
          .btn-secondary {
            background: #e5e7eb;
            color: #374151;
          }
          .btn-secondary:hover {
            background: #d1d5db;
          }
          .footer {
            margin-top: 32px;
            font-size: 13px;
            color: #9ca3af;
          }
          .footer a {
            color: #667eea;
            text-decoration: underline;
            padding: 0;
          }
          @media (max-width: 640px) {
            .container {
              padding: 32px 24px;
            }
            h1 {
              font-size: 24px;
            }
            .actions {
              flex-direction: column;
            }
            button, a {
              width: 100%;
            }
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1>Error Crítico de Aplicación</h1>

          <p>
            Lo sentimos, ha ocurrido un error crítico que impide que la aplicación funcione correctamente.
            Nuestro equipo ha sido notificado automáticamente.
          </p>

          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="error-info">
              <div className="error-message">{error.message}</div>
              {error.digest && (
                <div className="error-id">Error ID: {error.digest}</div>
              )}
            </div>
          )}

          <div className="actions">
            <button
              onClick={reset}
              className="btn-primary"
            >
              Intentar de nuevo
            </button>

            <Link href="/" className="btn-secondary">
              Volver al inicio
            </Link>
          </div>

          <div className="footer">
            Si el problema persiste, escríbenos a{' '}
            <a href="mailto:hola@inmogrid.cl">
              hola@inmogrid.cl
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
