/**
 * Opciones estáticas del formulario de perfil.
 *
 * TODO(Sprint 3): mover `REGIONES` a `@/shared/constants/regions.ts` para
 * que otros features (networking, events) también lo consuman sin duplicar.
 */

import { COMUNAS_CHILE } from '@/shared/constants/comunas';

export const PROFESSION_OPTIONS = [
  { value: '', label: 'Selecciona una opción' },
  { value: 'TASADOR_PERITO', label: 'Tasador / Perito' },
  { value: 'PERITO_JUDICIAL', label: 'Perito Judicial' },
  { value: 'CORREDOR_PROPIEDADES', label: 'Corredor de Propiedades' },
  { value: 'ADMINISTRADOR_PROP', label: 'Administrador de Propiedades' },
  { value: 'ABOGADO_INMOBILIARIO', label: 'Abogado Inmobiliario' },
  { value: 'ARQUITECTO', label: 'Arquitecto' },
  { value: 'INGENIERO_CIVIL', label: 'Ingeniero Civil' },
  { value: 'ACADEMICO', label: 'Académico' },
  { value: 'FUNCIONARIO_PUBLICO', label: 'Funcionario Público' },
  { value: 'INVERSIONISTA', label: 'Inversionista' },
  { value: 'PROPIETARIO', label: 'Propietario' },
  { value: 'OTRO', label: 'Otro' },
] as const;

export const REGIONES = [
  'Región de Arica y Parinacota',
  'Región de Tarapacá',
  'Región de Antofagasta',
  'Región de Atacama',
  'Región de Coquimbo',
  'Región de Valparaíso',
  'Región Metropolitana',
  "Región del Libertador General Bernardo O'Higgins",
  'Región del Maule',
  'Región de Ñuble',
  'Región del Biobío',
  'Región de La Araucanía',
  'Región de Los Ríos',
  'Región de Los Lagos',
  'Región de Aysén',
  'Región de Magallanes',
] as const;

/**
 * Los nombres en `REGIONES` están con prefijo "Región de..." (es lo que
 * guardamos en la DB porque es el nombre oficial). `shared/constants/comunas.ts`
 * usa nombres cortos para agrupar comunas. Este mapping traduce entre
 * ambos formatos — la única razón por la que existe es esa discrepancia
 * histórica; cualquier valor fuera del map rompe el dropdown de comuna.
 */
const REGION_SHORT_NAMES: Record<(typeof REGIONES)[number], string> = {
  'Región de Arica y Parinacota': 'Arica y Parinacota',
  'Región de Tarapacá': 'Tarapacá',
  'Región de Antofagasta': 'Antofagasta',
  'Región de Atacama': 'Atacama',
  'Región de Coquimbo': 'Coquimbo',
  'Región de Valparaíso': 'Valparaíso',
  'Región Metropolitana': 'Metropolitana',
  "Región del Libertador General Bernardo O'Higgins": "O'Higgins",
  'Región del Maule': 'Maule',
  'Región de Ñuble': 'Ñuble',
  'Región del Biobío': 'Biobío',
  'Región de La Araucanía': 'La Araucanía',
  'Región de Los Ríos': 'Los Ríos',
  'Región de Los Lagos': 'Los Lagos',
  'Región de Aysén': 'Aysén',
  'Región de Magallanes': 'Magallanes',
};

/**
 * Devuelve las comunas que pertenecen a una región (por nombre oficial
 * "Región de..."). Ordenadas alfabéticamente. Si la región es vacía o no
 * existe en el map, retorna `[]` — el dropdown de comuna queda deshabilitado.
 */
export function getComunasByRegion(regionFullName: string): string[] {
  if (!regionFullName) return [];
  const short = REGION_SHORT_NAMES[regionFullName as (typeof REGIONES)[number]];
  if (!short) return [];
  return COMUNAS_CHILE
    .filter((c) => c.region === short)
    .map((c) => c.nombre)
    .sort((a, b) => a.localeCompare(b, 'es'));
}
