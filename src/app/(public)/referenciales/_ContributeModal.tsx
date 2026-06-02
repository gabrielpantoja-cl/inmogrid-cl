'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DESTINO_LABELS } from '@/features/referenciales/lib/destino';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const CONTRIBUTION_TYPES = [
  { value: 'new', label: 'Nuevo registro' },
  { value: 'correction', label: 'Corrección de dato existente' },
  { value: 'report', label: 'Reporte de error' },
];

const INITIAL_FORM = {
  contributionType: 'new' as 'new' | 'correction' | 'report',
  lat: '',
  lng: '',
  comuna: '',
  predio: '',
  rol: '',
  anio: '',
  destino: '',
  superficieTerreno: '',
  superficieConstruida: '',
  monto: '',
  montoUf: '',
  cbr: '',
  observaciones: '',
};

export default function ContributeModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof typeof INITIAL_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);

    if (!Number.isFinite(lat) || lat < -56 || lat > -17.5) {
      setError('Latitud inválida. Rango Chile: -56 a -17.5');
      return;
    }
    if (!Number.isFinite(lng) || lng < -76 || lng > -66) {
      setError('Longitud inválida. Rango Chile: -76 a -66');
      return;
    }
    if (form.rol && !/^\d{1,5}-\d{1,4}$/.test(form.rol)) {
      setError('ROL inválido. Formato requerido: XXXXX-XXXX (ej: 12345-0001)');
      return;
    }

    const payload: Record<string, unknown> = {
      contributionType: form.contributionType,
      lat,
      lng,
    };
    if (form.comuna) payload.comuna = form.comuna;
    if (form.predio) payload.predio = form.predio;
    if (form.rol) payload.rol = form.rol;
    if (form.cbr) payload.cbr = form.cbr;
    if (form.anio) payload.anio = parseInt(form.anio, 10);
    if (form.destino) payload.destino = form.destino;
    if (form.superficieTerreno)
      payload.superficieTerreno = parseFloat(form.superficieTerreno);
    if (form.superficieConstruida)
      payload.superficieConstruida = parseFloat(form.superficieConstruida);
    if (form.monto) payload.monto = parseInt(form.monto, 10);
    if (form.montoUf) payload.montoUf = parseFloat(form.montoUf);
    if (form.observaciones) payload.observaciones = form.observaciones;

    setSubmitting(true);
    try {
      const res = await fetch('/api/referenciales/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar contribución');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* Backdrop — keyboard-accessible close */}
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Contribuir referencial</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Atajo a aporte masivo — para usuarios con varios registros que cargar */}
        <div className="border-b border-gray-100 bg-blue-50/50 px-5 py-2 text-xs text-blue-900">
          ¿Tienes varios registros?{' '}
          <Link
            href="/referenciales/aporte-masivo"
            className="font-medium underline hover:text-blue-700"
          >
            Carga masiva tipo planilla
          </Link>{' '}
          (pega desde Excel).
        </div>

        {/* Form */}
        <form id="contribute-form" onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
          {/* Tipo */}
          <div>
            <label htmlFor="cm-type" className="block text-xs font-medium text-gray-700 mb-1">
              Tipo de contribución
            </label>
            <select
              id="cm-type"
              value={form.contributionType}
              onChange={set('contributionType')}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              {CONTRIBUTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Coordenadas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cm-lat" className="block text-xs font-medium text-gray-700 mb-1">
                Latitud <span className="text-red-500">*</span>
              </label>
              <input
                id="cm-lat"
                type="number"
                step="any"
                placeholder="-33.4489"
                value={form.lat}
                onChange={set('lat')}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label htmlFor="cm-lng" className="block text-xs font-medium text-gray-700 mb-1">
                Longitud <span className="text-red-500">*</span>
              </label>
              <input
                id="cm-lng"
                type="number"
                step="any"
                placeholder="-70.6693"
                value={form.lng}
                onChange={set('lng')}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-2">
            Puedes obtener coordenadas desde Google Maps (clic derecho → &quot;¿Qué hay aquí?&quot;)
          </p>

          {/* Comuna */}
          <div>
            <label htmlFor="cm-comuna" className="block text-xs font-medium text-gray-700 mb-1">
              Comuna
            </label>
            <input
              id="cm-comuna"
              type="text"
              placeholder="ej: Providencia"
              value={form.comuna}
              onChange={set('comuna')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          {/* Predio */}
          <div>
            <label htmlFor="cm-predio" className="block text-xs font-medium text-gray-700 mb-1">
              Nombre del predio
            </label>
            <input
              id="cm-predio"
              type="text"
              placeholder="ej: Parcela 12 Hijuela 3"
              value={form.predio}
              onChange={set('predio')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>

          {/* ROL + CBR */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cm-rol" className="block text-xs font-medium text-gray-700 mb-1">
                ROL SII
              </label>
              <input
                id="cm-rol"
                type="text"
                placeholder="12345-0001"
                value={form.rol}
                onChange={set('rol')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label htmlFor="cm-cbr" className="block text-xs font-medium text-gray-700 mb-1">
                CBR
              </label>
              <input
                id="cm-cbr"
                type="text"
                placeholder="ej: Santiago"
                value={form.cbr}
                onChange={set('cbr')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>

          {/* Año + Destino */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cm-anio" className="block text-xs font-medium text-gray-700 mb-1">
                Año
              </label>
              <input
                id="cm-anio"
                type="number"
                placeholder="2024"
                min="1900"
                max="2100"
                value={form.anio}
                onChange={set('anio')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label htmlFor="cm-destino" className="block text-xs font-medium text-gray-700 mb-1">
                Destino (SII)
              </label>
              <select
                id="cm-destino"
                value={form.destino}
                onChange={set('destino')}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">— sin especificar —</option>
                {Object.entries(DESTINO_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {code} · {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Superficies split */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cm-sup-terreno" className="block text-xs font-medium text-gray-700 mb-1">
                Sup. terreno (m²)
              </label>
              <input
                id="cm-sup-terreno"
                type="number"
                step="any"
                placeholder="500"
                min="0"
                value={form.superficieTerreno}
                onChange={set('superficieTerreno')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label htmlFor="cm-sup-construida" className="block text-xs font-medium text-gray-700 mb-1">
                Sup. construida (m²)
              </label>
              <input
                id="cm-sup-construida"
                type="number"
                step="any"
                placeholder="120"
                min="0"
                value={form.superficieConstruida}
                onChange={set('superficieConstruida')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-gray-500">
            Deja en blanco las que no apliquen (ej: para un depto sólo construida; para
            un sitio eriazo sólo terreno).
          </p>

          {/* Monto CLP + Monto UF */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cm-monto" className="block text-xs font-medium text-gray-700 mb-1">
                Monto (CLP)
              </label>
              <input
                id="cm-monto"
                type="number"
                placeholder="150000000"
                min="0"
                value={form.monto}
                onChange={set('monto')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label htmlFor="cm-monto-uf" className="block text-xs font-medium text-gray-700 mb-1">
                Monto (UF)
              </label>
              <input
                id="cm-monto-uf"
                type="number"
                step="any"
                placeholder="4500"
                min="0"
                value={form.montoUf}
                onChange={set('montoUf')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label htmlFor="cm-obs" className="block text-xs font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              id="cm-obs"
              rows={3}
              placeholder="Información adicional, contexto de la transacción, fuente del dato…"
              value={form.observaciones}
              onChange={set('observaciones')}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{form.observaciones.length}/1000</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
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
            form="contribute-form"
            disabled={submitting}
            className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            {submitting ? 'Enviando…' : 'Enviar contribución'}
          </button>
        </div>
      </div>
    </div>
  );
}
