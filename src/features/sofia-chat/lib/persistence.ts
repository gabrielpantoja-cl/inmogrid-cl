import { prisma } from '@/shared/lib/prisma';

/**
 * Get an existing conversation or create a new one.
 * Supports both authenticated users (userId) and anonymous (sessionId).
 */
export async function getOrCreateConversation(params: {
  conversationId?: string;
  userId?: string;
  sessionId?: string;
  title?: string;
}): Promise<{ id: string; isNew: boolean }> {
  const { conversationId, userId, sessionId, title } = params;

  // Try to find existing conversation
  if (conversationId) {
    const existing = await prisma.sofiaConversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (existing) return { id: existing.id, isNew: false };
  }

  // Create new conversation
  const conversation = await prisma.sofiaConversation.create({
    data: {
      userId: userId || null,
      sessionId: sessionId || null,
      title: title ? title.slice(0, 100) : null,
    },
    select: { id: true },
  });

  return { id: conversation.id, isNew: true };
}

/**
 * Save a message to a conversation.
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<void> {
  await prisma.sofiaMessage.create({
    data: { conversationId, role, content },
  });
}

/**
 * Get conversation history (last N messages).
 */
export async function getHistory(
  conversationId: string,
  limit: number = 10
): Promise<Array<{ role: string; content: string }>> {
  const messages = await prisma.sofiaMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { role: true, content: true },
  });

  return messages;
}
