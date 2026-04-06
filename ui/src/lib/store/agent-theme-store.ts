import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentTheme = 'standard' | 'ocean' | 'olympus';

interface AgentThemeStore {
  agentTheme: AgentTheme;
  setAgentTheme: (theme: AgentTheme) => void;
}

export const useAgentThemeStore = create<AgentThemeStore>()(
  persist(
    (set) => ({
      agentTheme: 'standard',
      setAgentTheme: (agentTheme) => set({ agentTheme }),
    }),
    { name: 'turtleshell-agent-theme' },
  ),
);
