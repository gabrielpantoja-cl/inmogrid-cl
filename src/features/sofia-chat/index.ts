export { default as SofiaChatInterface } from './components/SofiaChatInterface';
export { useSofiaChat } from './hooks/useSofiaChat';
export { SOFIA_SYSTEM_PROMPT, searchDocuments, buildContext } from './lib/rag';
export { saveMessage, getOrCreateConversation, getHistory } from './lib/persistence';
