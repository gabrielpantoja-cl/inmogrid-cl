import type { Referencial } from './api';
import { destinoLabel } from './destino';

/**
 * Serializa una lista de referenciales a CSV listo para Excel es-CL:
 *   - UTF-8 con BOM (evita que Excel interprete mal los acentos).
 *   - Separador `;` (Excel español usa `;` como default; `,` lo parsea mal
 *     en celdas con comas decimales).
 *   - Escape RFC-4180: valores con `;`, `"`, `\n` o `\r` se envuelven en
 *     comillas dobles, y las comillas internas se duplican.
 *
 * La columna `monto` se emite **sin formato** (string numérico, vía
 * `montoRaw`) si está disponible; si no, como fallback, el valor formateado.
 * Esto permite que Excel lo trate como número cuando el origen es la API
 * autenticada.
 */
const UTF8_BOM = '\uFEFF';

type CsvColumn = {
  key: string;
  header: string;
  value: (r: Referencial) => string | number | undefined | null;
};

const COLUMNS: CsvColumn[] = [
  { key: 'id', header: 'ID', value: (r) => r.id },
  { key: 'comuna', header: 'Comuna', value: (r) => r.comuna },
  { key: 'predio', header: 'Predio', value: (r) => r.predio },
  { key: 'rol', header: 'ROL', value: (r) => r.rol },
  { key: 'cbr', header: 'CBR', value: (r) => r.cbr },
  { key: 'fojas', header: 'Fojas', value: (r) => r.fojas },
  { key: 'numero', header: 'Número', value: (r) => r.numero },
  { key: 'anio', header: 'Año', value: (r) => r.anio },
  { key: 'fechaescritura', header: 'Fecha escritura', value: (r) => r.fechaescritura },
  { key: 'superficieTerreno', header: 'Sup. terreno (m²)', value: (r) => r.superficieTerreno },
  { key: 'superficieConstruida', header: 'Sup. construida (m²)', value: (r) => r.superficieConstruida },
  { key: 'destinoCode', header: 'Destino (código)', value: (r) => r.destino },
  { key: 'destinoLabel', header: 'Destino', value: (r) => destinoLabel(r.destino) ?? r.destino },
  { key: 'monto', header: 'Monto (CLP)', value: (r) => r.montoRaw ?? r.monto },
  { key: 'montoUf', header: 'Monto (UF)', value: (r) => r.montoUf },
  { key: 'lat', header: 'Latitud', value: (r) => r.lat },
  { key: 'lng', header: 'Longitud', value: (r) => r.lng },
  { key: 'observaciones', header: 'Observaciones', value: (r) => r.observaciones },
];

function escapeCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV(rows: Referencial[]): string {
  const header = COLUMNS.map((c) => escapeCell(c.header)).join(';');
  const body = rows
    .map((r) => COLUMNS.map((c) => escapeCell(c.value(r))).join(';'))
    .join('\n');
  return `${UTF8_BOM}${header}\n${body}`;
}

/**
 * Fuerza la descarga de un CSV en el browser. No persiste nada server-side.
 * El nombre incluye timestamp para evitar colisiones cuando exportás varias
 * veces seguidas con distintos filtros.
 */
export function downloadCSV(rows: Referencial[], basename = 'referenciales'): void {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${basename}-${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
