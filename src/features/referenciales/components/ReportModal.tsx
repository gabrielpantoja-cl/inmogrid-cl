'use client';

import { useState } from 'react';
import type { Referencial } from '../lib/api';
import { getSuperficieRelevante } from '../lib/superficie';
import { destinoLabel } from '../lib/destino';

interface Props {
  referencial: Referencial;
  onClose: () => void;
  onSuccess: () => void;
}

const REPORT_REASONS = [
  'Monto inusual o incorrecto',
  'Datos del predio incorrectos',
  'Registro duplicado',
  'Coordenadas erróneas',
  'ROL no corresponde',
  'Fecha de escritura incorrecta',
  'Otro',
];

export default function ReportModal({ referencial: r, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const observaciones = notes.trim()
      ? `Motivo: ${reason}\n\n${notes.trim()}`
      : `Motivo: ${reason}`;

    try {
      const res = await fetch('/api/referenciales/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributionType: 'report',
          sourceId: r.id,
          lat: r.lat,
          lng: r.lng,
          ...(r.comuna && { comuna: r.comuna }),
          ...(r.predio && { predio: r.predio }),
          ...(r.rol && { rol: r.rol }),
          observaciones,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el reporte');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Reportar dato dudoso</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tu reporte será revisado por el equipo de inmogrid.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Datos del referencial (solo lectura) */}
        <div className="mx-5 mt-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm space-y-1">
          <p className="font-medium text-gray-800">
            {r.predio ?? 'Sin nombre'}{r.comuna ? ` · ${r.comuna}` : ''}
          </p>
          {r.monto && <p className="text-yellow-700 font-medium">{r.monto}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {r.rol && <span>ROL: {r.rol}</span>}
            {r.anio && <span>Año: {r.anio}</span>}
            {(() => {
              const sup = getSuperficieRelevante(r);
              if (sup.valor === null) return null;
              const tipoLabel = sup.fuente === 'terreno' ? 'terreno' : 'construida';
              return (
                <span>
                  {sup.valor.toLocaleString('es-CL')} m² {tipoLabel}
                </span>
              );
            })()}
            {r.destino && destinoLabel(r.destino) && (
              <span>{destinoLabel(r.destino)}</span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label htmlFor="report-reason" className="block text-xs font-medium text-gray-700 mb-1">
              Motivo del reporte
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-notes" className="block text-xs font-medium text-gray-700 mb-1">
              Observaciones adicionales{' '}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              id="report-notes"
              rows={3}
              placeholder="Describe el problema con más detalle…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{notes.length}/500</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {submitting ? 'Enviando…' : 'Enviar reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
