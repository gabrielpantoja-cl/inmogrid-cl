import { NextRequest } from 'next/server';
import { SofiaChatRequestSchema } from '@/shared/lib/schemas/sofia';
import { generateChatStream, type ChatMessage } from '@/shared/lib/gemini';
import { searchDocuments, buildContext, buildSystemPrompt } from '@/features/sofia-chat/lib/rag';
import { getOrCreateConversation, saveMessage, getHistory } from '@/features/sofia-chat/lib/persistence';
import { getUser } from '@/shared/lib/supabase/auth';
import { applyRateLimit } from '@/shared/lib/ratelimit';

export async function POST(request: NextRequest) {
  // Rate limiting (shared with v1 API)
  const rl = await applyRateLimit(request);
  if (rl?.response?.status === 429) return rl.response;

  try {
    const body = await request.json();
    const parsed = SofiaChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: 'Mensaje inválido', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { message, conversationId: reqConvId, sessionId } = parsed.data;

    // Auth is optional — works for anonymous + authenticated
    let userId: string | undefined;
    try {
      const user = await getUser();
      userId = user?.id;
    } catch {
      // Anonymous user — no problem
    }

    // Get or create conversation
    const { id: conversationId } = await getOrCreateConversation({
      conversationId: reqConvId,
      userId,
      sessionId,
      title: message.slice(0, 50),
    });

    // Save user message
    await saveMessage(conversationId, 'user', message);

    // Get conversation history for context
    const history = await getHistory(conversationId, 10);

    // RAG: search for relevant documents
    let ragContext = '';
    try {
      const docs = await searchDocuments(message, 5);
      ragContext = buildContext(docs);
    } catch (err) {
      console.warn('[Sofia] RAG search failed, continuing without context:', err);
    }

    // Build messages for Gemini
    const systemPrompt = buildSystemPrompt(ragContext);
    const geminiMessages: ChatMessage[] = history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Ensure last message is the current user message
    if (
      geminiMessages.length === 0 ||
      geminiMessages[geminiMessages.length - 1].parts[0].text !== message
    ) {
      geminiMessages.push({ role: 'user', parts: [{ text: message }] });
    }

    // Stream response via SSE
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generateChatStream(systemPrompt, geminiMessages)) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk, conversationId })}\n\n`)
            );
          }

          // Save complete assistant response
          await saveMessage(conversationId, 'assistant', fullResponse);

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, conversationId })}\n\n`)
          );
          controller.close();
        } catch (err) {
          console.error('[Sofia] Streaming error:', err);
          const errorMsg = 'Sofia no está disponible en este momento. Intenta de nuevo más tarde.';

          // Save error as response
          await saveMessage(conversationId, 'assistant', errorMsg).catch(() => {});

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg, conversationId })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Sofia] Chat error:', error);
    return Response.json(
      { error: 'Sofia no está disponible en este momento' },
      { status: 500 }
    );
  }
}
