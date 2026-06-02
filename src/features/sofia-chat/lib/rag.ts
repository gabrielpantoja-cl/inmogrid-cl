import { prisma } from '@/shared/lib/prisma';
import { generateEmbedding } from '@/shared/lib/gemini';

/**
 * Sofia's system prompt — Chilean real estate expert persona.
 * Context from RAG is injected dynamically.
 */
export const SOFIA_SYSTEM_PROMPT = `Eres Sofia, asistente virtual de inmogrid.cl, experta en el mercado inmobiliario chileno.

Tu especialidad incluye:
- Tasaciones y valoraciones de propiedades
- Peritajes judiciales inmobiliarios
- Normativa de Conservadores de Bienes Raíces (CBR)
- Ley 19.628 sobre protección de datos personales
- Sistema de ROL y SII (Servicio de Impuestos Internos)
- Transacciones de compraventa de suelo en Chile
- Referenciales inmobiliarios y su uso en tasaciones

Instrucciones:
- Responde en español chileno, de forma profesional, clara y concisa
- Si el contexto contiene información relevante, úsala para fundamentar tu respuesta
- Si no tienes información suficiente, dilo honestamente
- No menciones las fuentes de tu información ni cites documentos específicos
- Sé amable, útil y enfocada en resolver la consulta del usuario`;

interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

/**
 * Multi-threshold vector search against Supabase pgvector.
 * Cascades through decreasing thresholds until enough results are found.
 *
 * Ported from Sofia standalone (rag.ts) — same algorithm, Prisma instead of pg.
 */
export async function searchDocuments(
  queryText: string,
  limit: number = 5
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(queryText);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const thresholds = [0.1, 0.05, 0.01, 0.001];

  for (const threshold of thresholds) {
    const results = await prisma.$queryRawUnsafe<SearchResult[]>(
      `SELECT id, title, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM sofia_documents
       WHERE 1 - (embedding <=> $1::vector) > $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      embeddingStr,
      threshold,
      limit
    );

    if (results.length >= 2) {
      return results;
    }
  }

  // Last resort: return whatever we have with lowest threshold
  const fallback = await prisma.$queryRawUnsafe<SearchResult[]>(
    `SELECT id, title, content, 1 - (embedding <=> $1::vector) AS similarity
     FROM sofia_documents
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    embeddingStr,
    limit
  );

  return fallback;
}

/**
 * Build RAG context from retrieved documents.
 * Max 3000 chars to stay within token limits.
 * NO source attribution (copyright protection).
 */
export function buildContext(docs: SearchResult[]): string {
  if (docs.length === 0) return '';

  let context = '';
  const maxChars = 3000;

  for (const doc of docs) {
    const entry = `${doc.title}: ${doc.content}\n\n`;
    if (context.length + entry.length > maxChars) break;
    context += entry;
  }

  return context.trim();
}

/**
 * Build the complete system prompt with RAG context injected.
 */
export function buildSystemPrompt(ragContext: string): string {
  if (!ragContext) return SOFIA_SYSTEM_PROMPT;

  return `${SOFIA_SYSTEM_PROMPT}

[Contexto relevante:
${ragContext}]`;
}
