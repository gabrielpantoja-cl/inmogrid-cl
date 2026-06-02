import { z } from 'zod';

/**
 * Schema for incoming chat messages to Sofia API.
 */
export const SofiaChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().nullish().transform((v) => v ?? undefined),
  sessionId: z.string().nullish().transform((v) => v ?? undefined),
});

export type SofiaChatRequest = z.infer<typeof SofiaChatRequestSchema>;

/**
 * Schema for Sofia knowledge base documents.
 */
export const SofiaDocumentInputSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  documentType: z.string().max(50).default('general'),
  metadata: z.record(z.unknown()).default({}),
});

export type SofiaDocumentInput = z.infer<typeof SofiaDocumentInputSchema>;
