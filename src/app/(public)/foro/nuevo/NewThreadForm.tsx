'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RichTextEditor } from '@/shared/components/editor/RichTextEditor';

export function NewThreadForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (title.trim().length < 4) {
      setError('El título debe tener al menos 4 caracteres');
      return;
    }
    const plainText = html.replace(/<[^>]*>/g, '').trim();
    if (!plainText) {
      setError('El contenido no puede estar vacío');
      return;
    }

    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 30)
      .slice(0, 5);

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), contentHtml: html, tags }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo crear el hilo');
        return;
      }

      router.push(`/foro/${data.thread.slug}`);
    } catch (err) {
      console.error(err);
      setError('Error de red al publicar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="thread-title"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Título
        </label>
        <input
          id="thread-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          placeholder="Un título claro y específico"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <span
          id="thread-content-label"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Contenido
        </span>
        <div role="group" aria-labelledby="thread-content-label">
          <RichTextEditor
            value={html}
            onChange={setHtml}
            placeholder="Desarrolla tu pregunta o comentario. Puedes formatear el texto, añadir enlaces e imágenes con los botones de arriba."
            minHeight={240}
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="thread-tags"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Etiquetas <span className="text-gray-400 font-normal">(opcional, separadas por coma · máx. 5)</span>
        </label>
        <input
          id="thread-tags"
          type="text"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="tasación, peritaje, santiago"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        <Link
          href="/"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors"
        >
          {submitting ? 'Publicando…' : 'Publicar hilo'}
        </button>
      </div>
    </form>
  );
}
