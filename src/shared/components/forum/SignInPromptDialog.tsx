'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/shared/lib/supabase/client';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Fragmento que completa "Inicia sesión para …". Ej: "dejar tu me gusta". */
  reason?: string;
  /** Path al que volver después del login. Default: ruta actual + hash. */
  redirectTo?: string;
}

export function SignInPromptDialog({ open, onClose, reason, redirectTo }: Props) {
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const signIn = async () => {
    if (pending) return;
    setPending(true);
    const supabase = createClient();
    const next =
      redirectTo ??
      `${window.location.pathname}${window.location.search}${window.location.hash}`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-prompt-title"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in duration-200">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-6 w-6 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h2
          id="signin-prompt-title"
          className="text-center text-lg font-bold text-gray-900"
        >
          Únete a la conversación
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Inicia sesión para {reason ?? 'participar'} y sumarte al foro de
          profesionales inmobiliarios de Chile.
        </p>
        <button
          type="button"
          onClick={signIn}
          disabled={pending}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
        >
          <GoogleIcon className="h-4 w-4" />
          {pending ? 'Redirigiendo…' : 'Continuar con Google'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-lg py-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          Ahora no
        </button>
      </div>
    </div>,
    document.body,
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#FFFFFF"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#FFFFFF"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        opacity="0.9"
      />
      <path
        fill="#FFFFFF"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        opacity="0.75"
      />
      <path
        fill="#FFFFFF"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        opacity="0.85"
      />
    </svg>
  );
}
