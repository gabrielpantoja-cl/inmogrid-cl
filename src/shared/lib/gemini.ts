import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        'GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey'
      );
    }
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

/**
 * Generate a 768-dimensional embedding vector using Gemini text-embedding-004.
 * Used for RAG vector search in pgvector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

/**
 * Generate a streaming chat response using Gemini 2.5 Flash.
 * Returns an async iterable of text chunks.
 */
export async function* generateChatStream(
  systemPrompt: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: 2000,
      temperature: 0.7,
    },
  });

  const chat = model.startChat({
    history: messages.slice(0, -1),
  });

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) return;

  const result = await chat.sendMessageStream(lastMessage.parts[0].text);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

/**
 * Generate a non-streaming chat response (for simpler use cases).
 */
export async function generateChat(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of generateChatStream(systemPrompt, messages)) {
    chunks.push(chunk);
  }
  return chunks.join('');
}
