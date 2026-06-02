'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ContributeModal from '../_ContributeModal';

interface Contribution {
  id: string;
  contributionType: string;
  lat: number;
  lng: number;
  comuna: string | null;
  predio: string | null;
  rol: string | null;
  anio: number | null;
  monto: string | null;
  status: string;
  reviewNote: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Aprobado', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-800' },
};

export default function ContribucionesContent() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/referenciales/my-contributions?limit=50');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setContributions(data.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar contribuciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSuccess = () => {
    setShowModal(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis contribuciones</h1>
          <p className="mt-1 text-gray-600">
            Referenciales y reportes que has enviado a la comunidad.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/referenciales/aporte-masivo"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Aporte masivo
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-600"
          >
            + Contribuir
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-sm text-gray-500">
          Cargando contribuciones…
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {!loading && !error && contributions.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">
            Todavía no has contribuido ningún referencial.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600"
          >
            + Contribuir ahora
          </button>
        </div>
      )}
      {!loading && contributions.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Comuna</th>
                <th className="px-4 py-2 text-left">Predio</th>
                <th className="px-4 py-2 text-left">ROL</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2 text-left">Enviado</th>
                <th className="px-4 py-2 text-left">Nota revisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contributions.map((c) => {
                const status =
                  STATUS_LABELS[c.status] ?? {
                    label: c.status,
                    className: 'bg-gray-100 text-gray-700',
                  };
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700 capitalize">
                      {c.contributionType}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{c.comuna ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{c.predio ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{c.rol ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      {c.monto ? `$${Number(c.monto).toLocaleString('es-CL')}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 max-w-[160px] truncate">
                      {c.reviewNote ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ContributeModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
