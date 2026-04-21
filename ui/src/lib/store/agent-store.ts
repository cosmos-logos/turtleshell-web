import { create } from 'zustand';
import type { Agent } from '@/types/agent';
import { BUNDLED_MANIFESTS } from '@/manifests';

const CLOUD_ATHENA = 'https://api-int.turtleshell.ai/v1/athena';

// Cosmos / Logos identity + voice are sourced from bundled cosmos-logos
// manifests in `src/manifests/`. The builtin catalog entries here exist as a
// fallback for code paths that still read `agent.systemPrompt` / `agent.voice`
// directly (chat-client prefers the cosmos-logos store manifest when one is
// active — see Chat.tsx line 288). Keeping the prompt/voice in one place
// prevents drift between the manifest and the builtin.
const COSMOS_MANIFEST = BUNDLED_MANIFESTS.cosmos;
const LOGOS_MANIFEST = BUNDLED_MANIFESTS.logos;

const LOGOS_AGENT: Agent = {
  id: 'logos',
  name: 'Logos',
  description: 'The Turtle — ancient wisdom keeper, always available',
  icon: '🐢',
  capabilities: ['chat'],
  requiredServices: [],
  endpoint: CLOUD_ATHENA,
  systemPrompt: LOGOS_MANIFEST.identity.system_prompt,
  voice: LOGOS_MANIFEST.voice,
};

const COSMOS_AGENT: Agent = {
    id: 'cosmos',
    name: 'Cosmos',
    description: 'The Fish — navigator of agents and the digital universe',
    icon: '🐟',
    capabilities: ['chat'],
    requiredServices: [],
    endpoint: CLOUD_ATHENA,
    systemPrompt: COSMOS_MANIFEST.identity.system_prompt,
    voice: COSMOS_MANIFEST.voice,
};

// Note: Athena is NOT a catalog entry. It's a cosmos-logos agent auto-connected
// on app boot via useStartupRefresh. See lib/cosmos-logos/auto-connect.ts.

/** Agents available in the picker. Cosmos and Logos are personality presets;
 * Athena is a cosmos-logos agent (not in this catalog). */
// BYOK providers each ship with a bundled cosmos-logos manifest whose
// system_prompt is intentionally factual and personality-free — "dull and
// lifeless," per the BYOK onboarding contract. Chat.tsx routes these direct
// to the vendor (no Athena hop) and injects the manifest system_prompt so
// the model identifies itself as what it is (GPT / Claude / Grok / Gemini),
// not as a TurtleShell persona.
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
    systemPrompt: BUNDLED_MANIFESTS.claude.identity.system_prompt,
    visible: false,  // hidden until user adds their API key
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI — bring your own key',
    icon: '💬',
    capabilities: ['chat', 'reasoning'],
    requiredServices: [],
    systemPrompt: BUNDLED_MANIFESTS.openai.identity.system_prompt,
    visible: false,
  },
  {
    id: 'grok',
    name: 'Grok',
    description: 'xAI Grok — bring your own key',
    icon: '🔥',
    capabilities: ['chat', 'reasoning'],
    requiredServices: [],
    systemPrompt: BUNDLED_MANIFESTS.grok.identity.system_prompt,
    visible: false,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google Gemini — bring your own key',
    icon: '✦',
    capabilities: ['chat', 'reasoning'],
    requiredServices: [],
    systemPrompt: BUNDLED_MANIFESTS.gemini.identity.system_prompt,
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
    // Migrate legacy IDs to new names. 'athena' is no longer a catalog entry —
    // it lives in useCosmosLogosStore. Selected_agent='athena' falls through to LOGOS.
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

const BYOK_AGENT_IDS = new Set(['openai', 'claude', 'grok', 'gemini']);

function loadHiddenAgents(): Set<string> {
  try {
    const raw = localStorage.getItem('turtleshell-hidden-agents');
    const stored: Set<string> = raw ? new Set(JSON.parse(raw)) : new Set();
    const userKeys = getUserApiKeys();
    // Ensure agents with visible: false in catalog are hidden by default,
    // but auto-show BYOK agents that have a saved API key
    for (const agent of AGENT_CATALOG) {
      if (agent.visible === false && !stored.has(agent.id)) {
        if (BYOK_AGENT_IDS.has(agent.id) && (userKeys as Record<string, string>)[agent.id]) {
          // User has a key — keep visible
        } else {
          stored.add(agent.id);
        }
      }
      // Also unhide if key was added after initial hide
      if (BYOK_AGENT_IDS.has(agent.id) && stored.has(agent.id) && (userKeys as Record<string, string>)[agent.id]) {
        stored.delete(agent.id);
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
