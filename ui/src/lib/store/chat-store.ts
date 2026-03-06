import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/types/chat';

interface ChatStore {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  currentConversationId: string | null;
  memoryEnabled: boolean;
  saveConversation: boolean;
  pendingInput: string | null;

  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setConversationId: (id: string | null) => void;
  clearMessages: () => void;
  setMemoryEnabled: (enabled: boolean) => void;
  setSaveConversation: (enabled: boolean) => void;
  resumeConversation: (id: string, turns: ChatMessage[]) => void;
  startFromSeed: (prompt: string) => void;
  consumePendingInput: () => string | null;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      messages: [],
      isStreaming: false,
      error: null,
      currentConversationId: null,
      memoryEnabled: true,
      saveConversation: true,
      pendingInput: null,

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
      clearMessages: () => set({ messages: [], error: null, currentConversationId: null, pendingInput: null }),

      setMemoryEnabled: (enabled) =>
        set({
          memoryEnabled: enabled,
          ...(enabled ? {} : { saveConversation: false }),
        }),

      setSaveConversation: (enabled) =>
        set({
          saveConversation: enabled,
          ...(enabled ? { memoryEnabled: true } : {}),
        }),

      resumeConversation: (id, turns) =>
        set({
          currentConversationId: id,
          messages: turns,
          saveConversation: true,
          memoryEnabled: true,
          error: null,
          pendingInput: null,
        }),

      startFromSeed: (prompt) =>
        set({
          messages: [],
          currentConversationId: null,
          error: null,
          pendingInput: prompt,
        }),

      consumePendingInput: () => {
        const val = get().pendingInput;
        if (val) set({ pendingInput: null });
        return val;
      },
    }),
    {
      name: 'turtleshell-chat',
      partialize: (state) => ({
        memoryEnabled: state.memoryEnabled,
        saveConversation: state.saveConversation,
      }),
    },
  ),
);
