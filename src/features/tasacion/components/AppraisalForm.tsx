'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/primitives/button';
import { Input } from '@/shared/components/ui/primitives/input';
import { Label } from '@/shared/components/ui/primitives/label';
import ComunaAutocomplete from '@/shared/components/ui/forms/ComunaAutocomplete';
import { DESTINO_LABELS } from '../lib/destino';
import { QUALITY_LABELS, CONSERVATION_LABELS, DISPOSITION_LABELS } from '../lib/coeficientes';
import type { AppraisalInput } from '../lib/types';

const DESTINOS_TASABLES = ['H', 'W', 'C', 'O', 'Z', 'L', 'I', 'A', 'B', 'F'] as const;

interface Props {
  onSubmit: (data: AppraisalInput) => void;
  isLoading?: boolean;
}

export default function AppraisalForm({ onSubmit, isLoading }: Props) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState<Partial<AppraisalInput>>({
    destino: 'H',
    calidad: 'MEDIUM',
    estadoConservacion: 'STATE_2',
  });

  const set = <K extends keyof AppraisalInput>(k: K, v: AppraisalInput[K] | undefined) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.comuna || !form.destino) return;
    onSubmit(form as AppraisalInput);
  };

  const isMixto = form.destino === 'H';
  const isTerreno = ['W', 'A', 'B', 'F'].includes(form.destino ?? '');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Comuna */}
      <div className="space-y-1.5">
        <Label htmlFor="comuna">Comuna</Label>
        <ComunaAutocomplete
          value={form.comuna ?? ''}
          onChange={(v) => set('comuna', v)}
          placeholder="Ej: Talca, Santiago, Viña del Mar..."
        />
      </div>

      {/* Destino (tipo de propiedad) */}
      <div className="space-y-1.5">
        <Label htmlFor="destino">Tipo de propiedad</Label>
        <select
          id="destino"
          value={form.destino ?? 'H'}
          onChange={(e) => set('destino', e.target.value as AppraisalInput['destino'])}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {DESTINOS_TASABLES.map((code) => (
            <option key={code} value={code}>
              {code} — {DESTINO_LABELS[code] ?? code}
            </option>
          ))}
        </select>
      </div>

      {/* Superficies */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(isMixto || isTerreno) && (
          <div className="space-y-1.5">
            <Label htmlFor="sup-terreno">Superficie terreno (m²)</Label>
            <Input
              id="sup-terreno"
              type="number"
              min={1}
              step="any"
              placeholder="Ej: 300"
              value={form.superficieTerreno ?? ''}
              onChange={(e) =>
                set('superficieTerreno', e.target.value ? parseFloat(e.target.value) : undefined)
              }
            />
          </div>
        )}
        {(isMixto || !isTerreno) && (
          <div className="space-y-1.5">
            <Label htmlFor="sup-construida">
              Superficie construida (m²)
              {isMixto && <span className="ml-1 text-muted-foreground">(opcional si es casa)</span>}
            </Label>
            <Input
              id="sup-construida"
              type="number"
              min={1}
              step="any"
              placeholder="Ej: 120"
              value={form.superficieConstruida ?? ''}
              onChange={(e) =>
                set('superficieConstruida', e.target.value ? parseFloat(e.target.value) : undefined)
              }
            />
          </div>
        )}
      </div>

      {/* Año de construcción y estado de conservación */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ano">Año de construcción (opcional)</Label>
          <Input
            id="ano"
            type="number"
            min={1900}
            max={currentYear}
            placeholder={`Ej: ${currentYear - 15}`}
            value={form.anoConstruccion ?? ''}
            onChange={(e) =>
              set('anoConstruccion', e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="conservacion">Estado de conservación</Label>
          <select
            id="conservacion"
            value={form.estadoConservacion ?? 'STATE_2'}
            onChange={(e) =>
              set('estadoConservacion', e.target.value as AppraisalInput['estadoConservacion'])
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Object.entries(CONSERVATION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calidad y disposición */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="calidad">Calidad constructiva</Label>
          <select
            id="calidad"
            value={form.calidad ?? 'MEDIUM'}
            onChange={(e) => set('calidad', e.target.value as AppraisalInput['calidad'])}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Object.entries(QUALITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="disposicion">Disposición (opcional)</Label>
          <select
            id="disposicion"
            value={form.disposicion ?? ''}
            onChange={(e) =>
              set(
                'disposicion',
                e.target.value ? (e.target.value as AppraisalInput['disposicion']) : undefined
              )
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">No especificar</option>
            {Object.entries(DISPOSITION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" disabled={isLoading || !form.comuna} className="w-full">
        {isLoading ? 'Calculando...' : 'Calcular tasación'}
      </Button>
    </form>
  );
}
