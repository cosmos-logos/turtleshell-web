import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent } from '@/types/agent';

const defaultAgent: Agent = {
  id: 'athena',
  name: 'Athena',
  description: 'Sovereign AI Assistant',
  icon: '⚡',
  capabilities: ['chat', 'mcp', 'reasoning'],
  requiredServices: [],
};

interface AgentStore {
  agents: Agent[];
  activeAgent: Agent;

  setActiveAgent: (agent: Agent) => void;
  addAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
      agents: [defaultAgent],
      activeAgent: defaultAgent,

      setActiveAgent: (agent) => set({ activeAgent: agent }),

      addAgent: (agent) =>
        set((state) => ({ agents: [...state.agents, agent] })),

      removeAgent: (id) =>
        set((state) => ({
          agents: state.agents.filter((a) => a.id !== id),
        })),
    }),
    { name: 'turtleshell-agents' },
  ),
);
