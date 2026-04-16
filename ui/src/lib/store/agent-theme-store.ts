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
      // `ocean` is the brand-default: 🐙 Athena, 🐟 Cosmos, 🐢 Logos,
      // 🔱 Poseidon, 🐬 Apollo. `standard` (letter avatars) and `olympus`
      // (Greek-god emojis) are alternate themes reached via the theme
      // picker. BC-016 — we were shipping `standard` as the default, which
      // made Athena render as a plain "A" on the chat avatar instead of
      // the octopus.
      agentTheme: 'ocean',
      setAgentTheme: (agentTheme) => set({ agentTheme }),
    }),
    {
      name: 'turtleshell-agent-theme',
      version: 2,
      migrate: (persisted, fromVersion) => {
        // Legacy installs persisted `standard`. Flip those to `ocean` so
        // the change actually lands for returning users. Leave explicit
        // `olympus` picks alone — those are deliberate.
        const p = persisted as { agentTheme?: AgentTheme } | undefined;
        if (fromVersion < 2 && (!p?.agentTheme || p.agentTheme === 'standard')) {
          return { agentTheme: 'ocean' } as AgentThemeStore;
        }
        return (p ?? { agentTheme: 'ocean' }) as AgentThemeStore;
      },
    },
  ),
);
