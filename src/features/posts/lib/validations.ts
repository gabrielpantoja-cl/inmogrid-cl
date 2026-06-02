import { z } from 'zod';

/**
 * Schema para crear un post. Mantener sincronizado con el modelo `Post`
 * en `prisma/schema.prisma`.
 */
export const createPostSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200),
  content: z.string().min(1, 'El contenido es requerido'),
  excerpt: z.string().max(300).optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  published: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const updatePostSchema = createPostSchema.partial();

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

/**
 * Proyección estándar para respuestas públicas de posts.
 * NO expone `content` (puede ser grande — se pide explícitamente cuando
 * se abre un post individual).
 */
export const POST_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  published: true,
  publishedAt: true,
  tags: true,
  readTime: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const POST_DETAIL_SELECT = {
  ...POST_LIST_SELECT,
  content: true,
} as const;
