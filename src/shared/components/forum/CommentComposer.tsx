'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { createClient } from '@/shared/lib/supabase/client';
import { RichTextEditor } from '@/shared/components/editor/RichTextEditor';

interface CommentComposerProps {
  threadId: string;
}

export function CommentComposer({ threadId }: CommentComposerProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const text = value.replace(/<[^>]*>/g, '').trim();
    if (!text) {
      setError('El comentario no puede estar vacío');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/threads/${threadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentHtml: value }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'No se pudo publicar el comentario');
        return;
      }

      setValue('');
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Error de red al publicar el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-24 rounded-xl bg-gray-50 border border-gray-200 animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
        <p className="text-sm text-gray-700 mb-3">
          Inicia sesión para dejar tu comentario.
        </p>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Iniciar sesión con Google
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <RichTextEditor
        value={value}
        onChange={setValue}
        placeholder="Escribe tu comentario…"
        minHeight={120}
        disabled={submitting}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-primary-foreground transition-colors"
        >
          {submitting ? 'Publicando…' : 'Publicar comentario'}
        </button>
      </div>
    </form>
  );
}
