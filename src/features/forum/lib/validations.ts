import { z } from 'zod';

export const createThreadSchema = z.object({
  title: z.string().min(4, 'Título muy corto').max(200, 'Máximo 200 caracteres'),
  contentHtml: z
    .string()
    .min(1, 'El contenido es requerido')
    .max(50_000, 'Contenido demasiado largo'),
  tags: z.array(z.string().max(30)).max(5, 'Máximo 5 etiquetas').default([]),
});

export const createCommentSchema = z.object({
  contentHtml: z
    .string()
    .min(1, 'El comentario es requerido')
    .max(10_000, 'Comentario demasiado largo'),
  /** Si viene, es una respuesta al comentario con ese ID. */
  parentId: z.string().cuid().optional(),
});

// Para updates, todos los campos son opcionales — pero al menos uno debe venir.
export const updateThreadSchema = z
  .object({
    title: z.string().min(4).max(200).optional(),
    contentHtml: z.string().min(1).max(50_000).optional(),
    tags: z.array(z.string().max(30)).max(5).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proveer al menos un campo para actualizar',
  });

export const updateCommentSchema = z.object({
  contentHtml: z.string().min(1).max(10_000),
});

export const reportSchema = z.object({
  reason: z.enum(['spam', 'offensive', 'misleading', 'illegal', 'other']),
  details: z.string().max(500).optional(),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateThreadInput = z.infer<typeof updateThreadSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type ReportInput = z.infer<typeof reportSchema>;

// LIST select: incluimos `contentHtml` mínimo para que el server pueda
// extraer la primera imagen (cover preview) sin tener que ir al detail.
// El payload final que enviamos al cliente NO lleva HTML — el helper
// `buildThreadListItem` se queda solo con `coverImageUrl + preview`.
export const THREAD_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  tags: true,
  commentCount: true,
  likeCount: true,
  createdAt: true,
  updatedAt: true,
  editedAt: true,
  contentText: true,
  contentHtml: true,
  author: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
    },
  },
} as const;

// DETAIL select: igual que LIST (ambos incluyen contentHtml). Mantenemos
// el alias por claridad — la página de detalle tiene semántica distinta
// y puede divergir más adelante (campos de moderación, etc.).
export const THREAD_DETAIL_SELECT = THREAD_LIST_SELECT;
