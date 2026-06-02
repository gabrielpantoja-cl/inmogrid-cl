'use client';

import { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Search,
  X,
  Scale,
} from 'lucide-react';
import type { ConservadorEntry } from '@/shared/lib/queries/referenciales';

interface Props {
  conservadores: ConservadorEntry[];
}

export function ConservadoresGrid({ conservadores }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conservadores;
    return conservadores.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.comuna.toLowerCase().includes(q) ||
        c.jurisdiccion.some((j) => j.toLowerCase().includes(q))
    );
  }, [conservadores, query]);

  return (
    <>
      {/* Buscador */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por comuna o nombre del conservador..."
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Info banner — branding amarillo primary */}
      <div className="mb-6 p-4 bg-primary/10 text-gray-800 border border-primary/30 rounded-md text-sm">
        Directorio de Conservadores de Bienes Raíces en Chile. Aquí encontrarás
        la información de contacto, jurisdicción y ubicación de cada conservador.
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search className="mx-auto h-10 w-10 mb-3" />
          <p className="font-medium text-gray-600">Sin resultados</p>
          <p className="text-sm mt-1">Intenta con otro término de búsqueda.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900 leading-snug">
                      {c.nombre}
                    </h3>
                    {c.transacciones > 0 && (
                      <span
                        title={`${c.transacciones.toLocaleString('es-CL')} transacciones disponibles en inmogrid.cl`}
                        aria-label={`${c.transacciones.toLocaleString('es-CL')} transacciones disponibles en inmogrid.cl`}
                        className="flex-shrink-0 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full tabular-nums cursor-help"
                      >
                        {c.transacciones.toLocaleString('es-CL')}
                      </span>
                    )}
                  </div>

                  {/* Sede + región */}
                  <div className="mt-1.5 flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      {c.comuna}
                      {c.region && (
                        <span className="text-gray-400"> ({c.region})</span>
                      )}
                    </span>
                  </div>

                  {/* Jurisdicción — comunas que atiende este CBR. Ícono
                      balanza (Scale) deja claro que es su alcance legal. */}
                  {c.jurisdiccion.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                        <Scale className="h-3 w-3" />
                        <span>Jurisdicción</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.jurisdiccion.map((j) => (
                          <span
                            key={j}
                            className="text-xs bg-primary/10 text-gray-800 border border-primary/30 px-2 py-0.5 rounded-full"
                          >
                            {j}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dirección */}
                  {c.direccion && (
                    <div className="mt-3 flex items-start gap-1.5 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>{c.direccion}</span>
                    </div>
                  )}

                  {/* Email */}
                  {c.email && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <a
                        href={`mailto:${c.email}`}
                        className="text-gray-800 hover:text-primary hover:underline truncate"
                      >
                        {c.email}
                      </a>
                    </div>
                  )}

                  {/* Teléfono */}
                  {c.telefono && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <span className="text-gray-700">{c.telefono}</span>
                    </div>
                  )}

                  {/* Sitio web */}
                  {c.sitioWeb && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm">
                      <Globe className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <a
                        href={
                          c.sitioWeb.startsWith('http')
                            ? c.sitioWeb
                            : `https://${c.sitioWeb}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-800 hover:text-primary hover:underline truncate"
                      >
                        {c.sitioWeb.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      <p className="mt-8 text-center text-sm text-gray-400">
        {query
          ? `${filtered.length} de ${conservadores.length} conservadores`
          : `${conservadores.length} conservadores en el directorio`}
      </p>
    </>
  );
}
