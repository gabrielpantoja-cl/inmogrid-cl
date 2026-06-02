/**
 * Genera un slug único a partir de un título.
 * - Normaliza acentos
 * - Reemplaza no-alfanuméricos por guiones
 * - Añade sufijo temporal (base36) para garantizar unicidad
 */
export function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}

/**
 * Estima tiempo de lectura en minutos (200 palabras por minuto).
 */
export function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.ceil(words / 200);
}
