import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatPreferencesStore {
  showAgentAvatars: boolean;
  setShowAgentAvatars: (show: boolean) => void;
}

export const useChatPreferencesStore = create<ChatPreferencesStore>()(
  persist(
    (set) => ({
      showAgentAvatars: true,
      setShowAgentAvatars: (showAgentAvatars) => set({ showAgentAvatars }),
    }),
    { name: 'turtleshell-chat-preferences' },
  ),
);
