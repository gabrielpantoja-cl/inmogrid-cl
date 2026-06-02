-- Cleanup — drop de la tabla legacy chat_messages
-- ============================================================
-- CORRER MANUALMENTE en Supabase SQL Editor (proyecto
-- <supabase-project-ref>).
--
-- Contexto: `features/chat` fue el chatbot legacy basado en OpenAI GPT-4o-mini
-- (ruta /chatbot, endpoint /api/chat). Lo reemplazamos por `features/sofia-chat`
-- (Gemini + RAG con pgvector, ruta /sofia pendiente de reactivar). El feature
-- legacy queda eliminado completo del código — esta migration elimina su
-- storage en DB.
--
-- NO afecta las tablas de sofia-chat (sofia_documents, sofia_conversations,
-- sofia_messages) — esas siguen vivas, listas para cuando se reactive.
-- ============================================================

DROP TABLE IF EXISTS "chat_messages" CASCADE;
DROP TYPE  IF EXISTS "MessageRole";
