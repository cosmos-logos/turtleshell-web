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

const COSMOS_AGENT: Agent = {
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
};

/** Agents available in the picker. Cosmos first, then Logos. */
export const AGENT_CATALOG: Agent[] = [
  COSMOS_AGENT,
  LOGOS_AGENT,
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic Claude — bring your own key',
    icon: '🤖',
    capabilities: ['chat', 'reasoning'],
    requiredServices: [],
    visible: false,  // hidden until user adds their API key
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI — bring your own key',
    icon: '💬',
    capabilities: ['chat', 'reasoning'],
    requiredServices: [],
    visible: false,
  },
  {
    id: 'grok',
    name: 'Grok',
    description: 'xAI Grok — bring your own key',
    icon: '🔥',
    capabilities: ['chat', 'reasoning'],
    requiredServices: [],
    visible: false,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google Gemini — bring your own key',
    icon: '✦',
    capabilities: ['chat', 'reasoning'],
    requiredServices: [],
    visible: false,
  },
  {
    id: 'thoth',
    name: 'Thoth',
    description: 'Sovereign writing agent — journal, code review, branch management',
    icon: '📜',
    capabilities: ['chat', 'journal', 'code_review'],
    requiredServices: [],
    visible: false,  // hidden until connected via cosmos-logos
  },
  {
    id: 'homework-buddy',
    name: 'Homework Buddy',
    description: 'AI homework tutor for kids 10–17 with assignment tracking',
    icon: '📚',
    capabilities: ['chat', 'assignments'],
    requiredServices: [],
    visible: false,
  },
  {
    id: 'agora',
    name: 'Agora',
    description: 'Group collaboration — projects, chat, and AI powered by Google Sheets',
    icon: '🏛️',
    capabilities: ['chat', 'projects'],
    requiredServices: [],
    visible: false,
  },
];

/**
 * Sync check for whether the user has logged into Olympus Grid.
 */
export function hasOlympusGridToken(): boolean {
  return !!localStorage.getItem('olympus_grid_email');
}

// ── User API Keys (BYOK — Bring Your Own Key) ──────────────
const API_KEY_STORAGE = 'turtleshell-user-api-keys';

export interface UserApiKeys {
  openai?: string;
  claude?: string;
  grok?: string;
  gemini?: string;
}

export function getUserApiKeys(): UserApiKeys {
  try {
    const raw = localStorage.getItem(API_KEY_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function setUserApiKey(provider: keyof UserApiKeys, key: string) {
  const keys = getUserApiKeys();
  if (key.trim()) {
    keys[provider] = key.trim();
  } else {
    delete keys[provider];
  }
  localStorage.setItem(API_KEY_STORAGE, JSON.stringify(keys));
}

export function hasUserApiKey(provider: string): boolean {
  const keys = getUserApiKeys();
  return !!(keys as Record<string, string>)[provider];
}

/** Check if an agent is available — either via Olympus Grid OR user's own API key */
export function isAgentAvailable(agent: Agent): boolean {
  if (agent.requiredServices.length === 0) return true;
  // Check if user has their own key for this provider
  if (['openai', 'claude', 'grok', 'gemini'].includes(agent.id) && hasUserApiKey(agent.id)) return true;
  // Fall back to Olympus Grid auth
  if (agent.requiredServices.includes('olympus_grid') && hasOlympusGridToken()) return true;
  return false;
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
  /** Reload hiddenAgentIds from localStorage (call after external mutations). */
  reloadHidden: () => void;
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
    const stored: Set<string> = raw ? new Set(JSON.parse(raw)) : new Set();
    // Ensure agents with visible: false in catalog are hidden by default
    for (const agent of AGENT_CATALOG) {
      if (agent.visible === false && !stored.has(agent.id)) {
        stored.add(agent.id);
      }
    }
    return stored;
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

    reloadHidden: () => {
      set({ hiddenAgentIds: loadHiddenAgents() });
    },

    refreshAuth: () => {},
  }),
);
