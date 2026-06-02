'use client'

import { useState } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import Link from 'next/link'

export function LoginCard() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    if (isLoading) return
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (oauthError) {
        setError('No se pudo iniciar el proceso de autenticacion. Intenta nuevamente.')
        setIsLoading(false)
      }
      // On success the browser is redirected to Google; no further action needed here.
    } catch {
      setError('Error inesperado. Por favor intenta nuevamente.')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl px-8 py-10 flex flex-col items-center gap-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-3xl font-black tracking-tight text-white">
          inmo<span className="text-primary">grid</span>
        </span>
        <p className="text-sm text-neutral-400 text-center">
          Ecosistema digital colaborativo
        </p>
      </div>

      {/* Heading */}
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white">Bienvenido de vuelta</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Inicia sesion para continuar
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="w-full rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Google button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        aria-label="Continuar con Google"
        className="w-full flex items-center justify-center gap-3 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700 hover:border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:opacity-50 disabled:pointer-events-none"
      >
        {isLoading ? (
          <>
            <span
              aria-hidden="true"
              className="h-5 w-5 rounded-full border-2 border-neutral-600 border-t-white animate-spin"
            />
            Redirigiendo...
          </>
        ) : (
          <>
            {/* Google SVG logo */}
            <svg
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </>
        )}
      </button>

      {/* Legal */}
      <p className="text-xs text-neutral-500 text-center leading-relaxed">
        Al continuar, aceptas nuestros{' '}
        <Link
          href="/terms"
          className="underline underline-offset-2 hover:text-neutral-300 transition-colors"
        >
          Terminos de Servicio
        </Link>{' '}
        y{' '}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-neutral-300 transition-colors"
        >
          Politica de Privacidad
        </Link>
        .
      </p>

      {/* Back link */}
      <Link
        href="/"
        className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
