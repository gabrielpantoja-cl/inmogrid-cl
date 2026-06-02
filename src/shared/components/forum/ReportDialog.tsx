'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ReportReason = 'spam' | 'offensive' | 'misleading' | 'illegal' | 'other';

const REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: 'spam', label: 'Spam o publicidad', hint: 'Promoción masiva, links repetitivos.' },
  { value: 'offensive', label: 'Ofensivo o abusivo', hint: 'Insultos, acoso, discurso de odio.' },
  { value: 'misleading', label: 'Información engañosa', hint: 'Datos falsos o manipulados.' },
  { value: 'illegal', label: 'Contenido ilegal', hint: 'Violación de leyes o derechos.' },
  { value: 'other', label: 'Otro', hint: 'Describe el motivo abajo.' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  targetType: 'thread' | 'comment';
  targetId: string;
  /** Si target es comment, el threadId para el path del endpoint. */
  threadId?: string;
}

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  threadId,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, submitting]);

  // Reset al cerrar.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setReason('spam');
        setDetails('');
        setSubmitted(false);
        setError(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const endpoint =
        targetType === 'thread'
          ? `/api/threads/${targetId}/report`
          : `/api/threads/${threadId}/comments/${targetId}/report`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'No se pudo enviar el reporte');
        return;
      }
      setSubmitted(true);
      setTimeout(() => onClose(), 1800);
    } catch {
      setError('Error de red al enviar el reporte');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
        onClick={() => !submitting && onClose()}
      />
      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl">
        {submitted ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg
                className="h-6 w-6 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Reporte enviado</h2>
            <p className="mt-1 text-sm text-gray-600">
              Gracias. El equipo de moderación lo revisará pronto.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Reportar {targetType === 'thread' ? 'hilo' : 'comentario'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Cuéntanos qué está mal con este contenido.
              </p>
            </div>

            <div className="space-y-2">
              {REASONS.map((r) => {
                const inputId = `report-reason-${r.value}`;
                return (
                  <label
                    key={r.value}
                    htmlFor={inputId}
                    aria-label={r.label}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      reason === r.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="mt-0.5"
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {r.label}
                      </span>
                      <span className="text-xs text-gray-500">{r.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div>
              <label htmlFor="report-details" className="block text-sm font-medium text-gray-700 mb-1">
                Detalles {reason === 'other' && <span className="text-red-600">*</span>}
                <span className="ml-1 text-xs text-gray-400 font-normal">
                  (máx. 500 caracteres)
                </span>
              </label>
              <textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 500))}
                required={reason === 'other'}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Contexto adicional opcional"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Enviando…' : 'Enviar reporte'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
