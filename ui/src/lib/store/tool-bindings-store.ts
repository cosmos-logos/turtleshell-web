// ui/src/lib/store/tool-bindings-store.ts
//
// Per-agent tool bindings. Each binding is a sealed credentials envelope
// targeting a specific Poseidon tool server — only Poseidon can unseal,
// so persisting the ciphertext anywhere (localStorage here, olympus-grid
// ProfileData across devices) is safe.
//
// Shape:
//   bindings: Record<agentId, Record<toolServerCodename, ToolBinding>>
//
// Matches the per-agent pattern used by chat-store / memory / history.
// A binding is scoped to exactly one agent — adding Salesforce to
// Athena does NOT add it to Cosmos or Logos. The user adds it per
// agent because trust is per agent.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ToolBinding {
  /** Codename of the tool server (e.g. "poseidon-616-salesforce"). */
  toolServerCodename: string;
  /** Human name for the Tools panel (e.g. "Salesforce"). */
  displayName: string;
  /** MCP endpoint URL — where Athena dispatches tools/call. */
  mcpUrl: string;
  /** Manifest URL — canonical source of the server's public key. */
  manifestUrl: string;
  /** Base64-encoded libsodium sealed box targeting the tool
   *  server's public key. ONLY Poseidon can unseal this. */
  sealedEnvelope: string;
  /** ISO timestamp — when the binding was established. */
  addedAt: string;
  /** Optional color used by the Tools UI. */
  color?: string;
  /** Optional icon key used by the Tools UI. */
  icon?: string;
}

type BindingsByAgent = Record<string, Record<string, ToolBinding>>;

interface ToolBindingsState {
  bindings: BindingsByAgent;
  /** Add or replace a binding for (agentId, toolServerCodename). */
  addBinding: (agentId: string, binding: ToolBinding) => void;
  /** Remove the binding; user clicked "Disconnect". */
  removeBinding: (agentId: string, toolServerCodename: string) => void;
  /** Replace the entire bindings map — used by logout wipe and by
   *  profile-rehydrate after login on a new device. */
  replaceAll: (next: BindingsByAgent) => void;
  /** List bindings for a given agent. Stable array reference when
   *  the underlying record hasn't changed (consumers can memoize). */
  getBindingsForAgent: (agentId: string) => ToolBinding[];
}

const STORAGE_KEY = 'turtleshell-tool-bindings';

export const useToolBindingsStore = create<ToolBindingsState>()(
  persist(
    (set, get) => ({
      bindings: {},
      addBinding: (agentId, binding) =>
        set((state) => ({
          bindings: {
            ...state.bindings,
            [agentId]: {
              ...(state.bindings[agentId] || {}),
              [binding.toolServerCodename]: binding,
            },
          },
        })),
      removeBinding: (agentId, toolServerCodename) =>
        set((state) => {
          const forAgent = { ...(state.bindings[agentId] || {}) };
          delete forAgent[toolServerCodename];
          const next = { ...state.bindings };
          if (Object.keys(forAgent).length === 0) delete next[agentId];
          else next[agentId] = forAgent;
          return { bindings: next };
        }),
      replaceAll: (next) => set({ bindings: next }),
      getBindingsForAgent: (agentId) => {
        const forAgent = get().bindings[agentId];
        if (!forAgent) return [];
        return Object.values(forAgent);
      },
    }),
    {
      name: STORAGE_KEY,
      // Only persist the bindings map itself — method refs are recreated on rehydration.
      partialize: (state) => ({ bindings: state.bindings }),
    },
  ),
);

// ── Imperative helpers (non-React call sites) ──────────────────

export function getToolBindingsForAgent(agentId: string): ToolBinding[] {
  return useToolBindingsStore.getState().getBindingsForAgent(agentId);
}

export function addToolBinding(agentId: string, binding: ToolBinding): void {
  useToolBindingsStore.getState().addBinding(agentId, binding);
}

export function removeToolBinding(agentId: string, toolServerCodename: string): void {
  useToolBindingsStore.getState().removeBinding(agentId, toolServerCodename);
}

/**
 * Wipe every binding. Called by logout / identity-switch security
 * paths. The sealed blobs on olympus-grid ProfileData stay where
 * they are — they're already ciphertext and belong to the identity
 * that owns them; a fresh login on the same device for the same
 * user will rehydrate them from the profile round-trip.
 */
export function clearAllToolBindings(): void {
  useToolBindingsStore.getState().replaceAll({});
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // non-fatal
  }
}

/**
 * Replace all bindings from a server-side source (the profile
 * round-trip). Called by the login flow once the user's ProfileData
 * is fetched.
 */
export function hydrateToolBindings(next: BindingsByAgent): void {
  useToolBindingsStore.getState().replaceAll(next || {});
}
