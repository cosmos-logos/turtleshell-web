// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage, ChatMessageProvenance } from '@/types/chat';

interface AgentThread {
  messages: ChatMessage[];
  conversationId: string | null;
}

interface ChatStore {
  threads: Record<string, AgentThread>;
  activeAgentId: string;

  /** Current thread's messages (synced on every mutation) */
  messages: ChatMessage[];
  currentConversationId: string | null;

  isStreaming: boolean;
  error: string | null;
  memoryEnabled: boolean;
  saveConversation: boolean;
  pendingInput: string | null;

  switchAgent: (agentId: string) => void;
  newThread: () => void;
  addMessage: (message: ChatMessage) => void;
  updateLastAssistantMessage: (content: string) => void;
  /** EOS-5.4: attach the provenance frame to the most-recent assistant
   *  message. Called from Chat.tsx when streamChat yields a `provenance`
   *  metadata object. Powered-by chip renders when this is present. */
  setLastAssistantProvenance: (provenance: ChatMessageProvenance) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setConversationId: (id: string | null) => void;
  clearMessages: () => void;
  setMemoryEnabled: (enabled: boolean) => void;
  setSaveConversation: (enabled: boolean) => void;
  resumeConversation: (id: string, turns: ChatMessage[]) => void;
  startFromSeed: (prompt: string) => void;
  consumePendingInput: () => string | null;
  clearAllHistory: () => void;
}

function thread(threads: Record<string, AgentThread>, id: string): AgentThread {
  return threads[id] || { messages: [], conversationId: null };
}

/** Sync messages/conversationId from the active thread */
function syncDerived(threads: Record<string, AgentThread>, activeAgentId: string) {
  const t = thread(threads, activeAgentId);
  return { messages: t.messages, currentConversationId: t.conversationId };
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      threads: {},
      activeAgentId: 'logos',
      messages: [],
      currentConversationId: null,
      isStreaming: false,
      error: null,
      memoryEnabled: true,
      saveConversation: true,
      pendingInput: null,

      switchAgent: (agentId) => {
        if (agentId === get().activeAgentId) return;
        const threads = get().threads;
        set({
          activeAgentId: agentId,
          ...syncDerived(threads, agentId),
          isStreaming: false,
          error: null,
          pendingInput: null,
        });
      },

      newThread: () => {
        const { activeAgentId, threads } = get();
        const updated = { ...threads, [activeAgentId]: { messages: [], conversationId: null } };
        set({ threads: updated, ...syncDerived(updated, activeAgentId), error: null, pendingInput: null });
      },

      addMessage: (message) => {
        const { activeAgentId, threads } = get();
        const t = thread(threads, activeAgentId);
        const updated = {
          ...threads,
          [activeAgentId]: { ...t, messages: [...t.messages, message] },
        };
        set({ threads: updated, ...syncDerived(updated, activeAgentId) });
      },

      updateLastAssistantMessage: (content) => {
        const { activeAgentId, threads } = get();
        const t = thread(threads, activeAgentId);
        const msgs = [...t.messages];
        const last = msgs.length - 1;
        if (last >= 0 && msgs[last]?.role === 'assistant') {
          msgs[last] = { ...msgs[last], content };
        }
        const updated = { ...threads, [activeAgentId]: { ...t, messages: msgs } };
        set({ threads: updated, ...syncDerived(updated, activeAgentId) });
      },

      setLastAssistantProvenance: (provenance) => {
        const { activeAgentId, threads } = get();
        const t = thread(threads, activeAgentId);
        const msgs = [...t.messages];
        const last = msgs.length - 1;
        if (last >= 0 && msgs[last]?.role === 'assistant') {
          msgs[last] = { ...msgs[last], provenance };
        }
        const updated = { ...threads, [activeAgentId]: { ...t, messages: msgs } };
        set({ threads: updated, ...syncDerived(updated, activeAgentId) });
      },

      setStreaming: (isStreaming) => set({ isStreaming }),
      setError: (error) => set({ error }),

      setConversationId: (id) => {
        const { activeAgentId, threads } = get();
        const t = thread(threads, activeAgentId);
        const updated = { ...threads, [activeAgentId]: { ...t, conversationId: id } };
        set({ threads: updated, currentConversationId: id });
      },

      clearMessages: () => {
        const { activeAgentId, threads } = get();
        const updated = { ...threads, [activeAgentId]: { messages: [], conversationId: null } };
        set({ threads: updated, ...syncDerived(updated, activeAgentId), error: null, pendingInput: null });
      },

      setMemoryEnabled: (enabled) =>
        set({ memoryEnabled: enabled, ...(enabled ? {} : { saveConversation: false }) }),

      setSaveConversation: (enabled) =>
        set({ saveConversation: enabled, ...(enabled ? { memoryEnabled: true } : {}) }),

      resumeConversation: (id, turns) => {
        const { activeAgentId, threads } = get();
        const updated = { ...threads, [activeAgentId]: { messages: turns, conversationId: id } };
        set({
          threads: updated, ...syncDerived(updated, activeAgentId),
          saveConversation: true, memoryEnabled: true, error: null, pendingInput: null,
        });
      },

      startFromSeed: (prompt) => {
        const { activeAgentId, threads } = get();
        const updated = { ...threads, [activeAgentId]: { messages: [], conversationId: null } };
        set({ threads: updated, ...syncDerived(updated, activeAgentId), error: null, pendingInput: prompt });
      },

      consumePendingInput: () => {
        const val = get().pendingInput;
        if (val) set({ pendingInput: null });
        return val;
      },

      clearAllHistory: () => {
        set({
          threads: {},
          messages: [],
          currentConversationId: null,
          error: null,
          pendingInput: null,
        });
      },
    }),
    {
      name: 'turtleshell-chat',
      partialize: (state) => ({
        // Strip ChatMessage.attachments before persist. Attachment thumbnail
        // data URLs (even at 96px JPEG) plus filenames can push a chat
        // history past the 5 MB localStorage cap when several turns each
        // include images. Attachments are an in-session render-only
        // affordance — the canonical conversation history that Mnemosyne
        // (server-side) keeps is text-only via the augmented prompt block.
        // Reloading the page will simply render the user bubble without the
        // thumbnail strip; the chat content (and Athena's reply) survive.
        threads: Object.fromEntries(
          Object.entries(state.threads).map(([agentId, t]: [string, any]) => [
            agentId,
            {
              ...t,
              messages: (t.messages ?? []).map((m: any) => {
                if (!m.attachments) return m;
                const { attachments: _drop, ...rest } = m;
                return rest;
              }),
            },
          ]),
        ),
        activeAgentId: state.activeAgentId,
        memoryEnabled: state.memoryEnabled,
        saveConversation: state.saveConversation,
      }),
      onRehydrateStorage: () => (state: any) => {
        if (state) {
          const t = thread(state.threads, state.activeAgentId);
          state.messages = t.messages;
          state.currentConversationId = t.conversationId;
        }
      },
    },
  ),
);
