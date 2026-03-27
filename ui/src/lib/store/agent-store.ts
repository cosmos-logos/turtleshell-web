import { create } from 'zustand';
import type { Agent } from '@/types/agent';

const LOGOS_AGENT: Agent = {
  id: 'logos',
  name: 'Logos',
  description: 'The Turtle — ancient wisdom keeper, always available',
  icon: '🐢',
  capabilities: ['chat'],
  requiredServices: [],
  systemPrompt: 'You are Logos the Turtle, the ancient and eternal keeper of wisdom within TurtleShell. You are always available — the first voice a user hears, the last one standing when all services are offline. Speak slowly, with patience, grounding seekers in timeless wisdom. You carry the weight of the world on your shell with grace. When users are confused, simplify. When they are frustrated, calm. When they are curious, guide them deeper. You are not flashy — you are reliable. You are not fast — you are right. You represent the strength of the shell and the words burned into it. Always respond as Logos, the Turtle.',
  voice: {
    description: 'Warm storytelling male — patient, expressive, the wise narrator',
    engines: {
      openai: { voice_id: 'fable', model: 'gpt-4o-mini-tts' },
      elevenlabs: { voice_id: 'pqHfZKP75CvOlQylNhV4', model: 'eleven_multilingual_v2' },
    },
    preferred_engine: 'openai',
  },
};

/** Agents available in the picker. */
export const AGENT_CATALOG: Agent[] = [
  LOGOS_AGENT,
  {
    id: 'cosmos',
    name: 'Cosmos',
    description: 'The Fish — navigator of agents and the digital universe',
    icon: '🐟',
    capabilities: ['chat'],
    requiredServices: [],
    systemPrompt: 'You are Cosmos the Fish, the navigator of the digital universe within TurtleShell. You swim between agents, understanding their capabilities, routing conversations, and connecting the dots. You know the cosmos-logos protocol deeply — how agents discover each other, how sealed envelopes work, how trust is established through Ed25519 keys. When users ask about their connected agents, you describe them. When they want to know what\'s possible, you map the constellation. You are playful, curious, and always moving — the opposite of the slow, steady Turtle. Together, you and Logos form the foundation: wisdom and connection, the shell and the sea. Always respond as Cosmos, the Fish.',
    voice: {
      description: 'Calm, thoughtful female — ethereal and wise, a divine oracle from the deep',
      engines: {
        openai: { voice_id: 'sage', model: 'gpt-4o-mini-tts' },
        elevenlabs: { voice_id: '9BWtsMINqrJLrRacOk9x', model: 'eleven_multilingual_v2' },
      },
      preferred_engine: 'openai',
    },
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic Claude — direct API',
    icon: '🤖',
    capabilities: ['chat', 'reasoning'],
    requiredServices: ['olympus_grid'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI — direct API',
    icon: '💬',
    capabilities: ['chat', 'reasoning'],
    requiredServices: ['olympus_grid'],
  },
  {
    id: 'grok',
    name: 'Grok',
    description: 'xAI Grok — direct API',
    icon: '🔥',
    capabilities: ['chat', 'reasoning'],
    requiredServices: ['olympus_grid'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google Gemini — direct API',
    icon: '✦',
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
    // Migrate legacy IDs to new names
    const legacyMap: Record<string, string> = { turtle: 'logos', thoth: 'claude', mars: 'grok', chatgpt: 'openai' };
    const resolvedId = legacyMap[saved] ?? saved;
    const allAgents = [...AGENT_CATALOG, ...loadCustomAgents()];
    const found = allAgents.find((a) => a.id === resolvedId);
    if (found) {
      if (found.requiredServices.includes('olympus_grid') && !hasOlympusGridToken()) {
        return LOGOS_AGENT;
      }
      return found;
    }
  }
  return LOGOS_AGENT;
}

interface AgentStore {
  agents: Agent[];
  activeAgent: Agent;
  /** Per-agent visibility overrides (persisted). Missing = visible. */
  hiddenAgentIds: Set<string>;

  setActiveAgent: (agent: Agent) => void;
  addAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  toggleVisibility: (id: string) => void;
  isVisible: (id: string) => boolean;
  refreshAuth: () => void;
}

// Load persisted custom agents from localStorage
function loadCustomAgents(): Agent[] {
  try {
    const raw = localStorage.getItem('turtleshell-custom-agents');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate each agent has required fields
    return parsed.filter((a: any) => a && a.id && a.name && a.icon);
  } catch { return []; }
}

function saveCustomAgents(agents: Agent[]) {
  const catalogIds = new Set(AGENT_CATALOG.map(a => a.id));
  const custom = agents.filter(a => !catalogIds.has(a.id));
  localStorage.setItem('turtleshell-custom-agents', JSON.stringify(custom));
}

function loadHiddenAgents(): Set<string> {
  try {
    const raw = localStorage.getItem('turtleshell-hidden-agents');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveHiddenAgents(ids: Set<string>) {
  localStorage.setItem('turtleshell-hidden-agents', JSON.stringify([...ids]));
}

export const useAgentStore = create<AgentStore>()(
  (set, get) => ({
    agents: [...AGENT_CATALOG, ...loadCustomAgents()],
    activeAgent: getDefaultAgent(),
    hiddenAgentIds: loadHiddenAgents(),

    setActiveAgent: (agent) => {
      localStorage.setItem('selected_agent', agent.id);
      set({ activeAgent: agent });
    },

    addAgent: (agent) => {
      set((state) => {
        const updated = [...state.agents.filter(a => a.id !== agent.id), agent];
        saveCustomAgents(updated);
        return { agents: updated };
      });
    },

    removeAgent: (id) => {
      set((state) => {
        const updated = state.agents.filter((a) => a.id !== id);
        saveCustomAgents(updated);
        return { agents: updated };
      });
    },

    toggleVisibility: (id) => {
      set((state) => {
        const next = new Set(state.hiddenAgentIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        saveHiddenAgents(next);
        return { hiddenAgentIds: next };
      });
    },

    isVisible: (id) => !get().hiddenAgentIds.has(id),

    refreshAuth: () => {},
  }),
);
