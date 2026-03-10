import { create } from 'zustand';
import type { Agent } from '@/types/agent';

const TURTLE_AGENT: Agent = {
  id: 'turtle',
  name: 'Turtle',
  description: 'Local AI — always available, no account required',
  icon: '\ud83d\udc22',
  capabilities: ['chat'],
  requiredServices: [],
};

const ATHENA_AGENT: Agent = {
  id: 'athena',
  name: 'Athena',
  description: 'Sovereign AI Assistant',
  icon: '\u26a1',
  capabilities: ['chat', 'mcp', 'reasoning'],
  requiredServices: ['olympus_grid'],
};

/** Agents available in the picker. */
export const AGENT_CATALOG: Agent[] = [
  TURTLE_AGENT,
  ATHENA_AGENT,
  {
    id: 'thoth',
    name: 'Thoth',
    description: 'Claude-powered reasoning agent',
    icon: '\ud83d\udcdc',
    capabilities: ['chat', 'reasoning'],
    requiredServices: ['olympus_grid'],
  },
  {
    id: 'mars',
    name: 'Mars',
    description: 'Grok-powered assistant',
    icon: '\ud83d\udee1\ufe0f',
    capabilities: ['chat', 'reasoning'],
    requiredServices: ['olympus_grid'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google Gemini assistant',
    icon: '\u2727',
    capabilities: ['chat', 'reasoning'],
    requiredServices: ['olympus_grid'],
  },
];

/**
 * Sync check for whether the user has logged into Olympus Grid.
 * Uses olympus_grid_email as a proxy — the actual auth token is
 * in an httpOnly cookie and cannot be read from JS.
 */
export function hasOlympusGridToken(): boolean {
  return !!localStorage.getItem('olympus_grid_email');
}

/** Return the correct default agent based on auth state. */
function getDefaultAgent(): Agent {
  const saved = localStorage.getItem('selected_agent');
  if (saved) {
    const found = AGENT_CATALOG.find((a) => a.id === saved);
    if (found) {
      // If saved agent requires auth and user is not authed, fall back
      if (found.requiredServices.includes('olympus_grid') && !hasOlympusGridToken()) {
        return TURTLE_AGENT;
      }
      return found;
    }
  }
  return hasOlympusGridToken() ? ATHENA_AGENT : TURTLE_AGENT;
}

interface AgentStore {
  agents: Agent[];
  activeAgent: Agent;

  setActiveAgent: (agent: Agent) => void;
  addAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  /** Re-evaluate auth state and correct the active agent if needed. */
  refreshAuth: () => void;
}

export const useAgentStore = create<AgentStore>()(
  (set, get) => ({
    agents: AGENT_CATALOG,
    activeAgent: getDefaultAgent(),

    setActiveAgent: (agent) => {
      localStorage.setItem('selected_agent', agent.id);
      set({ activeAgent: agent });
    },

    addAgent: (agent) =>
      set((state) => ({ agents: [...state.agents, agent] })),

    removeAgent: (id) =>
      set((state) => ({
        agents: state.agents.filter((a) => a.id !== id),
      })),

    refreshAuth: () => {
      const current = get().activeAgent;
      if (current.requiredServices.includes('olympus_grid') && !hasOlympusGridToken()) {
        localStorage.setItem('selected_agent', TURTLE_AGENT.id);
        set({ activeAgent: TURTLE_AGENT });
      }
    },
  }),
);
