import { z } from 'zod';

/** Códigos SII de destino aceptados (1 letra). Sincronizado con DESTINO_LABELS. */
const DESTINO_CODES = [
  'H', 'W', 'C', 'O', 'Z', 'L', 'I', 'A', 'B', 'F',
  'D', 'E', 'G', 'M', 'P', 'Q', 'S', 'T', 'V',
] as const;

const commonOptional = {
  sourceId: z.string().max(100).optional(),
  fojas: z.string().max(50).optional(),
  numero: z.number().int().positive().optional(),
  anio: z.number().int().min(1900).max(2100).optional(),
  cbr: z.string().max(200).optional(),
  predio: z.string().max(500).optional(),
  comuna: z.string().max(100).optional(),
  fechaescritura: z.string().datetime().optional(),
  superficieTerreno: z.number().positive().optional(),
  superficieConstruida: z.number().positive().optional(),
  destino: z.enum(DESTINO_CODES).optional(),
  monto: z.number().int().nonnegative().optional(),
  /** Monto en UF — opcional, sólo si el aportante lo conoce. */
  montoUf: z.number().positive().optional(),
  observaciones: z.string().max(1000).optional(),
};

const ROL_REGEX = /^\d{1,5}-\d{1,4}$/;

/**
 * Aportes "new" / "correction": validación estricta porque el usuario está
 * proponiendo dato bueno — geocercado a Chile y ROL bien formado.
 */
const StrictContributionSchema = z.object({
  contributionType: z.enum(['new', 'correction']),
  lat: z.number().min(-56).max(-17.5),
  lng: z.number().min(-76).max(-66),
  rol: z.string().regex(ROL_REGEX, 'ROL must match format XXXXX-XXXX').optional(),
  ...commonOptional,
});

/**
 * Reportes ("report"): validación relajada. El payload viaja con los datos
 * del referencial reportado tal como existen en Neon — y precisamente cuando
 * el usuario reporta es porque la fila tiene ROL fuera de formato, lat/lng
 * dudosas, etc. Si gateamos con las reglas estrictas no se puede reportar
 * lo que se quiere reportar (catch-22). Mantenemos límites de string para
 * defensa frente a payloads abusivos, pero sin bounds geográficos ni regex.
 */
const ReportContributionSchema = z.object({
  contributionType: z.literal('report'),
  lat: z.number(),
  lng: z.number(),
  rol: z.string().max(200).optional(),
  ...commonOptional,
});

/**
 * Zod schema for user contribution input.
 * Geographic bounds enforce Chilean territory for new contributions/corrections.
 * Reports bypass strict validation — see ReportContributionSchema above.
 */
export const ContributionInputSchema = z.discriminatedUnion('contributionType', [
  StrictContributionSchema,
  ReportContributionSchema,
]);

export type ContributionInput = z.infer<typeof ContributionInputSchema>;

/**
 * Zod schema for admin review action.
 */
export const ReviewInputSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().max(500).optional(),
});

export type ReviewInput = z.infer<typeof ReviewInputSchema>;
