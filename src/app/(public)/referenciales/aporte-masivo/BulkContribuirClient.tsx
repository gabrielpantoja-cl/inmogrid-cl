'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { DESTINO_LABELS } from '@/features/referenciales/lib/destino';

const ROL_REGEX = /^\d{1,5}-\d{1,4}$/;
const VALID_DESTINOS = new Set(Object.keys(DESTINO_LABELS));

type RowState = {
  id: string;
  lat: string;
  lng: string;
  comuna: string;
  predio: string;
  rol: string;
  cbr: string;
  fojas: string;
  numero: string;
  anio: string;
  fechaescritura: string;
  destino: string;
  superficieTerreno: string;
  superficieConstruida: string;
  monto: string;
  montoUf: string;
  observaciones: string;
};

type FieldKey = Exclude<keyof RowState, 'id'>;

type FieldValidation = { ok: boolean; error?: string; warning?: string };

type ColumnDef = {
  key: FieldKey;
  label: string;
  required?: boolean;
  width: string;
  placeholder: string;
  inputMode?: 'numeric' | 'decimal' | 'text';
};

const COLUMNS: ColumnDef[] = [
  { key: 'lat', label: 'Latitud', required: true, width: 'w-28', placeholder: '-33.4489', inputMode: 'decimal' },
  { key: 'lng', label: 'Longitud', required: true, width: 'w-28', placeholder: '-70.6693', inputMode: 'decimal' },
  { key: 'comuna', label: 'Comuna', width: 'w-32', placeholder: 'Providencia' },
  { key: 'predio', label: 'Predio', width: 'w-44', placeholder: 'Parcela 12 Hijuela 3' },
  { key: 'rol', label: 'ROL', width: 'w-28', placeholder: '12345-0001' },
  { key: 'cbr', label: 'CBR', width: 'w-32', placeholder: 'Santiago' },
  { key: 'fojas', label: 'Fojas', width: 'w-20', placeholder: '1234v' },
  { key: 'numero', label: 'Número', width: 'w-20', placeholder: '5678', inputMode: 'numeric' },
  { key: 'anio', label: 'Año', width: 'w-20', placeholder: '2024', inputMode: 'numeric' },
  { key: 'fechaescritura', label: 'Fecha esc.', width: 'w-32', placeholder: 'YYYY-MM-DD' },
  { key: 'destino', label: 'Destino', width: 'w-20', placeholder: 'H' },
  { key: 'superficieTerreno', label: 'Sup. terreno (m²)', width: 'w-28', placeholder: '500', inputMode: 'decimal' },
  { key: 'superficieConstruida', label: 'Sup. construida (m²)', width: 'w-28', placeholder: '120', inputMode: 'decimal' },
  { key: 'monto', label: 'Monto (CLP)', width: 'w-32', placeholder: '150000000', inputMode: 'numeric' },
  { key: 'montoUf', label: 'Monto (UF)', width: 'w-24', placeholder: '4500', inputMode: 'decimal' },
  { key: 'observaciones', label: 'Observaciones', width: 'w-56', placeholder: 'Notas, contexto…' },
];

const FIELD_KEYS: FieldKey[] = COLUMNS.map((c) => c.key);

function emptyRow(): RowState {
  return {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    lat: '',
    lng: '',
    comuna: '',
    predio: '',
    rol: '',
    cbr: '',
    fojas: '',
    numero: '',
    anio: '',
    fechaescritura: '',
    destino: '',
    superficieTerreno: '',
    superficieConstruida: '',
    monto: '',
    montoUf: '',
    observaciones: '',
  };
}

/**
 * Validación por celda. Replica la lógica del schema Zod en
 * `ContributionInputSchema` (server-side) para feedback inmediato.
 * Si la fuente de verdad cambia en el server, hay que sincronizar acá.
 */
function validateCell(field: FieldKey, value: string, contributionType: 'new' | 'correction' | 'report'): FieldValidation {
  const v = value.trim();

  if (field === 'lat') {
    if (!v) return { ok: false, error: 'Requerido' };
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return { ok: false, error: 'No es un número' };
    if (contributionType !== 'report' && (n < -56 || n > -17.5)) {
      return { ok: false, error: 'Fuera de Chile (-56 a -17.5)' };
    }
    return { ok: true };
  }

  if (field === 'lng') {
    if (!v) return { ok: false, error: 'Requerido' };
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return { ok: false, error: 'No es un número' };
    if (contributionType !== 'report' && (n < -76 || n > -66)) {
      return { ok: false, error: 'Fuera de Chile (-76 a -66)' };
    }
    return { ok: true };
  }

  if (field === 'rol') {
    if (!v) return { ok: true };
    if (contributionType !== 'report' && !ROL_REGEX.test(v)) {
      return { ok: false, error: 'Formato XXXXX-XXXX' };
    }
    return { ok: true };
  }

  if (field === 'anio') {
    if (!v) return { ok: true };
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return { ok: false, error: 'No es un número' };
    if (n < 1900 || n > 2100) return { ok: false, error: 'Fuera de rango (1900-2100)' };
    return { ok: true };
  }

  if (field === 'numero') {
    if (!v) return { ok: true };
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, error: 'Entero positivo' };
    return { ok: true };
  }

  if (field === 'superficieTerreno' || field === 'superficieConstruida') {
    if (!v) return { ok: true };
    const n = parseFloat(v);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, error: 'Número positivo' };
    return { ok: true };
  }

  if (field === 'destino') {
    if (!v) return { ok: true };
    const code = v.toUpperCase();
    if (!VALID_DESTINOS.has(code)) {
      return { ok: false, error: 'Código SII inválido (1 letra: H, W, C, A, …)' };
    }
    return { ok: true };
  }

  if (field === 'monto') {
    if (!v) return { ok: true };
    if (/[.,]/.test(v)) return { ok: false, error: 'Sin separadores de miles' };
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: 'Entero ≥ 0' };
    if (n > 0 && n < 1_000_000) return { ok: true, warning: 'Monto bajo en CLP' };
    return { ok: true };
  }

  if (field === 'montoUf') {
    if (!v) return { ok: true };
    const n = parseFloat(v);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, error: 'Número positivo' };
    return { ok: true };
  }

  if (field === 'fechaescritura') {
    if (!v) return { ok: true };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: 'Formato YYYY-MM-DD' };
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return { ok: false, error: 'Fecha inválida' };
    if (d > new Date()) return { ok: false, error: 'No puede ser futura' };
    if (d.getFullYear() < 1900) return { ok: false, error: 'Año < 1900' };
    return { ok: true };
  }

  // String fields (comuna, predio, cbr, fojas, observaciones): solo límite de largo.
  const limits: Partial<Record<FieldKey, number>> = {
    comuna: 100,
    predio: 500,
    cbr: 200,
    fojas: 50,
    observaciones: 1000,
  };
  const max = limits[field];
  if (max && v.length > max) return { ok: false, error: `Máx ${max} caracteres` };
  return { ok: true };
}

/**
 * Convierte una fila del formulario a payload listo para POST /api/.../bulk.
 * Sólo incluye campos no-vacíos para que el schema discriminated-union de
 * Zod no rechace strings vacíos como tipo equivocado.
 */
function rowToPayload(row: RowState, contributionType: 'new' | 'correction' | 'report') {
  const payload: Record<string, unknown> = {
    contributionType,
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
  };
  if (row.comuna.trim()) payload.comuna = row.comuna.trim();
  if (row.predio.trim()) payload.predio = row.predio.trim();
  if (row.rol.trim()) payload.rol = row.rol.trim();
  if (row.cbr.trim()) payload.cbr = row.cbr.trim();
  if (row.fojas.trim()) payload.fojas = row.fojas.trim();
  if (row.numero.trim()) payload.numero = parseInt(row.numero, 10);
  if (row.anio.trim()) payload.anio = parseInt(row.anio, 10);
  if (row.fechaescritura.trim()) {
    // Schema espera ISO datetime; agregamos hora 00:00 UTC.
    payload.fechaescritura = `${row.fechaescritura.trim()}T00:00:00.000Z`;
  }
  if (row.destino.trim()) payload.destino = row.destino.trim().toUpperCase();
  if (row.superficieTerreno.trim()) payload.superficieTerreno = parseFloat(row.superficieTerreno);
  if (row.superficieConstruida.trim()) payload.superficieConstruida = parseFloat(row.superficieConstruida);
  if (row.monto.trim()) payload.monto = parseInt(row.monto, 10);
  if (row.montoUf.trim()) payload.montoUf = parseFloat(row.montoUf);
  if (row.observaciones.trim()) payload.observaciones = row.observaciones.trim();
  return payload;
}

type SubmitResult =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; count: number }
  | { kind: 'validation-error'; itemErrors: { index: number; errors: { path: string; message: string }[] }[] }
  | { kind: 'server-error'; message: string };

export default function BulkContribuirClient() {
  const [rows, setRows] = useState<RowState[]>(() =>
    Array.from({ length: 3 }, () => emptyRow())
  );
  const [contributionType, setContributionType] = useState<'new' | 'correction' | 'report'>('new');
  const [submit, setSubmit] = useState<SubmitResult>({ kind: 'idle' });

  const validations = useMemo(() => {
    const map = new Map<string, Partial<Record<FieldKey, FieldValidation>>>();
    rows.forEach((row) => {
      const fieldMap: Partial<Record<FieldKey, FieldValidation>> = {};
      FIELD_KEYS.forEach((field) => {
        fieldMap[field] = validateCell(field, row[field], contributionType);
      });
      map.set(row.id, fieldMap);
    });
    return map;
  }, [rows, contributionType]);

  const errorCount = useMemo(() => {
    let count = 0;
    validations.forEach((fields) => {
      FIELD_KEYS.forEach((f) => {
        if (fields[f]?.ok === false) count++;
      });
    });
    return count;
  }, [validations]);

  const filledRowCount = useMemo(
    () => rows.filter((r) => r.lat.trim() || r.lng.trim()).length,
    [rows]
  );

  const updateCell = useCallback((rowId: string, field: FieldKey, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyRow()]);
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== rowId)));
  }, []);

  const clearAll = useCallback(() => {
    setRows([emptyRow(), emptyRow(), emptyRow()]);
    setSubmit({ kind: 'idle' });
  }, []);

  /**
   * Sugerencia de pre-llenado para H/W/C/Z según `destino` — UX mínima.
   * Cuando el aportante pone "Z" o "L" y deja construida vacía, podríamos
   * marcar la celda con un hint. Por ahora no autoescribimos para no
   * sorprender al usuario, sólo validamos.
   */

  /**
   * Paste-from-Excel: cuando el usuario pega desde una planilla, los datos
   * vienen como TSV (tabuladores entre celdas, \n entre filas). Si pegas
   * desde Google Sheets también sirve. CSV (con `;` o `,`) también funciona
   * — detectamos el separador.
   *
   * El comportamiento: si el clipboard tiene más de una celda, sobreescribimos
   * desde la celda donde el usuario pegó hacia abajo y a la derecha,
   * extendiendo filas si es necesario.
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, fieldIndex: number) => {
      const text = e.clipboardData.getData('text');
      if (!text || (!text.includes('\t') && !text.includes('\n'))) {
        // Pega normal de una sola celda — dejamos que el navegador lo maneje.
        return;
      }

      e.preventDefault();

      // Detecta separador: tab > coma > punto y coma. Excel y Sheets usan tab.
      const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
      const detectSep = (line: string) => {
        if (line.includes('\t')) return '\t';
        const semi = (line.match(/;/g) || []).length;
        const comma = (line.match(/,/g) || []).length;
        return semi > comma ? ';' : ',';
      };
      const sep = detectSep(lines[0]);

      const matrix = lines.map((line) => line.split(sep).map((c) => c.trim()));

      setRows((prev) => {
        // Asegurar que hay suficientes filas
        const needed = rowIndex + matrix.length;
        const extended = prev.length >= needed
          ? [...prev]
          : [...prev, ...Array.from({ length: needed - prev.length }, () => emptyRow())];

        matrix.forEach((rowData, dy) => {
          const targetRowIdx = rowIndex + dy;
          if (targetRowIdx >= extended.length) return;
          const targetRow = { ...extended[targetRowIdx] };
          rowData.forEach((cellValue, dx) => {
            const targetFieldIdx = fieldIndex + dx;
            if (targetFieldIdx >= FIELD_KEYS.length) return;
            const targetField = FIELD_KEYS[targetFieldIdx];
            (targetRow as Record<FieldKey, string> & { id: string })[targetField] = cellValue;
          });
          extended[targetRowIdx] = targetRow;
        });

        return extended;
      });
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    setSubmit({ kind: 'submitting' });

    const filled = rows.filter((r) => r.lat.trim() || r.lng.trim());
    if (filled.length === 0) {
      setSubmit({ kind: 'server-error', message: 'No hay filas para enviar' });
      return;
    }

    const items = filled.map((r) => rowToPayload(r, contributionType));

    try {
      const res = await fetch('/api/referenciales/contribute/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 201 && data.success) {
        setSubmit({ kind: 'success', count: data.count });
        return;
      }

      if (res.status === 400 && data.itemErrors) {
        setSubmit({ kind: 'validation-error', itemErrors: data.itemErrors });
        return;
      }

      setSubmit({
        kind: 'server-error',
        message: data.error || `Error ${res.status}`,
      });
    } catch (err) {
      setSubmit({
        kind: 'server-error',
        message: err instanceof Error ? err.message : 'Error de red',
      });
    }
  }, [rows, contributionType]);

  // Mapa indice→errores del server, para resaltar las filas que el server rechazó
  const serverErrorsByFilledIndex = useMemo(() => {
    if (submit.kind !== 'validation-error') return null;
    const map = new Map<number, string[]>();
    submit.itemErrors.forEach((e) => {
      map.set(e.index, e.errors.map((er) => `${er.path}: ${er.message}`));
    });
    return map;
  }, [submit]);

  const filledRowIds = useMemo(() => {
    const ids: string[] = [];
    rows.forEach((r) => {
      if (r.lat.trim() || r.lng.trim()) ids.push(r.id);
    });
    return ids;
  }, [rows]);

  if (submit.kind === 'success') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <CheckCircleIcon className="mx-auto w-16 h-16 text-green-500" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          {submit.count} {submit.count === 1 ? 'aporte enviado' : 'aportes enviados'}
        </h1>
        <p className="mt-2 text-gray-600">
          Tus contribuciones quedaron en estado <strong>pendiente</strong> de revisión por un
          administrador. Se publicarán en la base de referenciales una vez aprobadas.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cargar más
          </button>
          <Link
            href="/referenciales/mis-aportes"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ver mis aportes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aporte masivo de referenciales</h1>
          <p className="text-sm text-gray-600 mt-1">
            Carga varias filas a la vez como una planilla. Pega desde Excel, valida en tiempo real
            y envía todo en bloque.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="bulk-type" className="text-xs font-medium text-gray-700">
            Tipo:
          </label>
          <select
            id="bulk-type"
            value={contributionType}
            onChange={(e) => setContributionType(e.target.value as typeof contributionType)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="new">Nuevos registros</option>
            <option value="correction">Correcciones</option>
            <option value="report">Reportes de error</option>
          </select>
        </div>
      </header>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 flex items-start gap-2">
        <ClipboardDocumentIcon className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <strong>Tip:</strong> selecciona un rango en Excel/Google Sheets, copia (Ctrl+C),
          haz click en una celda de la tabla y pega (Ctrl+V). Los datos se distribuirán
          automáticamente. Las columnas deben estar en el mismo orden de esta planilla.
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="w-10 px-2 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">
                #
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`${col.width} px-2 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-l border-gray-100`}
                >
                  {col.label}
                  {col.required && <span className="text-red-500 ml-0.5">*</span>}
                </th>
              ))}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const rowValidation = validations.get(row.id) ?? {};
              const filledIdx = filledRowIds.indexOf(row.id);
              const serverErrors = filledIdx >= 0 ? serverErrorsByFilledIndex?.get(filledIdx) : null;

              return (
                <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-2 py-1 text-center text-[10px] text-gray-400 tabular-nums">
                    {rowIdx + 1}
                  </td>
                  {COLUMNS.map((col, colIdx) => {
                    const validation = rowValidation[col.key];
                    const isError = validation?.ok === false;
                    const isWarning = validation?.warning;
                    const value = row[col.key];

                    let cellClass =
                      'w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded focus:outline-none focus:ring-1 ';
                    if (isError && value.trim()) {
                      cellClass += 'border-red-300 bg-red-50 focus:ring-red-400';
                    } else if (isWarning) {
                      cellClass += 'border-yellow-300 bg-yellow-50 focus:ring-yellow-400';
                    } else if (value.trim()) {
                      cellClass += 'border-green-200 bg-green-50/50 focus:ring-green-400';
                    } else {
                      cellClass += 'focus:ring-blue-400 focus:border-blue-300';
                    }

                    return (
                      <td key={col.key} className="px-1 py-0.5 border-l border-gray-100 align-top">
                        <input
                          type="text"
                          inputMode={col.inputMode}
                          value={value}
                          placeholder={col.placeholder}
                          onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                          onPaste={(e) => handlePaste(e, rowIdx, colIdx)}
                          className={cellClass}
                          aria-invalid={isError && value.trim() ? true : undefined}
                          title={
                            (validation?.error && value.trim() ? validation.error : '') ||
                            validation?.warning ||
                            ''
                          }
                        />
                        {isError && value.trim() && (
                          <div className="text-[10px] text-red-600 px-2 leading-tight">
                            {validation?.error}
                          </div>
                        )}
                        {isWarning && (
                          <div className="text-[10px] text-yellow-700 px-2 leading-tight">
                            {validation?.warning}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-1 py-0.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Eliminar fila"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    {serverErrors && serverErrors.length > 0 && (
                      <div className="text-[10px] text-red-600 mt-1">
                        <ExclamationTriangleIcon className="w-3 h-3 inline" />{' '}
                        {serverErrors.length}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <PlusIcon className="w-4 h-4" />
            Agregar fila
          </button>

          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Limpiar todo
          </button>
        </div>

        <div className="text-sm text-gray-600 tabular-nums">
          {filledRowCount} fila{filledRowCount !== 1 ? 's' : ''} con datos ·{' '}
          {errorCount > 0 ? (
            <span className="text-red-600 font-medium">{errorCount} error(es)</span>
          ) : (
            <span className="text-green-600">sin errores</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={
            submit.kind === 'submitting' ||
            filledRowCount === 0 ||
            errorCount > 0
          }
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUpTrayIcon className="w-4 h-4" />
          {submit.kind === 'submitting'
            ? 'Enviando…'
            : `Enviar ${filledRowCount} aporte${filledRowCount !== 1 ? 's' : ''}`}
        </button>
      </div>

      {submit.kind === 'server-error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Error al enviar:</strong> {submit.message}
        </div>
      )}

      {submit.kind === 'validation-error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>El servidor rechazó {submit.itemErrors.length} fila(s):</strong>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            {submit.itemErrors.slice(0, 5).map((e, i) => (
              <li key={i}>
                Fila {e.index + 1}:{' '}
                {e.errors.map((er) => `${er.path} (${er.message})`).join(', ')}
              </li>
            ))}
            {submit.itemErrors.length > 5 && (
              <li>… y {submit.itemErrors.length - 5} más. Revisa las celdas marcadas en rojo.</li>
            )}
          </ul>
        </div>
      )}

      <details className="rounded-lg border border-gray-200 bg-white p-3">
        <summary className="text-sm font-medium text-gray-700 cursor-pointer">
          Formato esperado de cada columna
        </summary>
        <ul className="mt-3 text-xs text-gray-600 space-y-1.5">
          <li>
            <strong>Latitud / Longitud</strong> — decimal con punto (ej: -33.4489). Para nuevos
            registros y correcciones debe estar dentro de Chile.
          </li>
          <li>
            <strong>ROL</strong> — formato XXXXX-XXXX (ej: 12345-0001). Opcional para reportes.
          </li>
          <li>
            <strong>Año</strong> — entre 1900 y 2100.
          </li>
          <li>
            <strong>Fecha escritura</strong> — formato YYYY-MM-DD (ej: 2024-03-15).
          </li>
          <li>
            <strong>Monto (CLP)</strong> — entero en pesos chilenos sin separadores (ej: 150000000, NO
            150.000.000). <strong>Monto (UF)</strong> — decimal con punto (ej: 4500.5), opcional.
          </li>
          <li>
            <strong>Destino</strong> — código SII de 1 letra. H=Habitacional, W=Terreno (Sitio Eriazo),
            C=Comercial, O=Oficina, Z=Estacionamiento, L=Bodega, I=Industrial, A=Agrícola, B=Agroindustrial,
            F=Forestal, D/E/G/M/P/Q/S/T/V para casos específicos.
          </li>
          <li>
            <strong>Sup. terreno</strong> — m² del lote (deja vacío en deptos / oficinas / parking
            en propiedad horizontal). <strong>Sup. construida</strong> — m² edificados (deja vacío en
            sitios eriazos / terrenos puros).
          </li>
        </ul>
      </details>
    </div>
  );
}
