'use client';

import { useState, useCallback, useRef } from 'react';

export interface SofiaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('sofia_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('sofia_session_id', id);
  }
  return id;
}

export function useSofiaChat() {
  const [messages, setMessages] = useState<SofiaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: SofiaMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      const assistantId = crypto.randomUUID();
      const assistantMessage: SofiaMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);

      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/sofia/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            conversationId,
            sessionId: getSessionId(),
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Error de conexión');
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No stream');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.conversationId) {
                setConversationId(data.conversationId);
              }

              if (data.text) {
                accumulated += data.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulated, isStreaming: true }
                      : m
                  )
                );
              }

              if (data.done) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, isStreaming: false } : m
                  )
                );
              }

              if (data.error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: data.error, isStreaming: false }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: 'Sofia no está disponible en este momento. Intenta de nuevo.',
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [isLoading, conversationId]
  );

  const resetConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    abortRef.current?.abort();
  }, []);

  return { messages, isLoading, sendMessage, resetConversation, conversationId };
}
