import { create } from 'zustand';
import type { ChatMessage } from '@/types/chat';

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  currentConversationId: string | null;

  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setConversationId: (id: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isStreaming: false,
  error: null,
  currentConversationId: null,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastAssistantMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIdx = messages.length - 1;
      if (lastIdx >= 0 && messages[lastIdx]?.role === 'assistant') {
        messages[lastIdx] = { ...messages[lastIdx], content };
      }
      return { messages };
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setError: (error) => set({ error }),
  setConversationId: (currentConversationId) => set({ currentConversationId }),
  clearMessages: () => set({ messages: [], error: null, currentConversationId: null }),
}));
