// src/lib/store/sovereign-ai-store.ts
//
// Sovereign AI settings — per-provider slot storage for BYOK keys + endpoints.
// Structural mirror of omens' scripts/settings/SovereignAISettings.cs (Zustand
// flavor). The wire contract is defined by
// olympus-616/docs/sovereign-ai-seam-cross-surface-reference.md §6.1.
//
// Load-bearing invariants (per Steward 2026-07-06):
//   1. Keys persist PER PROVIDER — switching from OpenAI to Grok MUST NOT
//      wipe the OpenAI key. `setChatProvider(p, key, endpoint)` is ADDITIVE
//      on the key dimension: passing empty/undefined does NOT clear the
//      stored slot. Explicit `clearChatByokFor(provider)` for revocation.
//   2. `chatByokKey` (and friends) are DERIVED getters — always resolve to
//      the CURRENT provider's slot. Backward-compatible with any legacy
//      caller that reads `settings.chatByokKey` directly.
//   3. Legacy `turtleshell-user-api-keys` (single-blob storage from before
//      per-provider slots) migrates on first load. Provider names are
//      remapped: 'claude' (turtleshell-web's internal alias) → 'anthropic'
//      (the wire allowlist value Athena expects).
//   4. NEVER log the raw key. Persist middleware writes plaintext to
//      localStorage (device-local); diagnostics emit `byokPresent: bool`.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Wire-safe provider identifiers — match the sovereign envelope allowlist
 *  Athena and Apollo enforce. */
export const CHAT_OLYMPUS_GRID = 'olympus-grid';
export const VOICE_OLYMPUS_GRID = 'olympus-grid';

interface SovereignAiState {
  /** Whether AI is turned on at all. When false, chat/voice surfaces should
   *  refuse to invoke inference. Non-LLM capabilities keep working. */
  useAI: boolean;

  /** The currently-selected chat provider. Points at whichever slot's key +
   *  endpoint fill the derived getters below. */
  chatProvider: string;

  /** The currently-selected voice provider. */
  voiceProvider: string;

  /** Per-provider slot storage. Every user's whole stable of BYOK keys stays
   *  on device; picking a provider just moves the pointer, not the material. */
  chatKeysByProvider: Record<string, string>;
  chatEndpointsByProvider: Record<string, string>;
  voiceKeysByProvider: Record<string, string>;
  voiceEndpointsByProvider: Record<string, string>;

  /** Schema version for legacy migrations (see LEGACY_USER_API_KEYS_STORAGE). */
  schemaVersion: number;

  // ── Setters ──

  setUseAI: (value: boolean) => void;

  /**
   * Update the chat provider selection AND persist any BYOK material into
   * that provider's slot. Additive on the key dimension — passing null or
   * empty does NOT wipe stored slots. To clear, call clearChatByokFor.
   */
  setChatProvider: (provider: string, byokKey?: string | null, byokEndpoint?: string | null) => void;

  setVoiceProvider: (provider: string, byokKey?: string | null, byokEndpoint?: string | null) => void;

  /** Explicitly wipe the stored BYOK key + endpoint for a specific chat
   *  provider. Used for revocation. Does not change the currently-selected
   *  provider. */
  clearChatByokFor: (provider: string) => void;

  clearVoiceByokFor: (provider: string) => void;
}

const LEGACY_USER_API_KEYS_STORAGE = 'turtleshell-user-api-keys';
const SCHEMA_VERSION = 2;

/** Legacy migration: pull anything from the pre-EOS-5.4
 *  'turtleshell-user-api-keys' single-blob (used by direct-chat.ts /
 *  agent-store.ts hasUserApiKey) into per-provider slots. Provider names
 *  are remapped:
 *   - 'claude' (turtleshell-web internal alias) → 'anthropic' (wire name)
 *   - 'openai', 'grok', 'gemini' → passthrough
 *  The legacy row is left untouched so the existing direct-chat path keeps
 *  working during transition; it will be cleaned up in the same PR that
 *  retires direct-chat. */
function migrateLegacyKeys(existing: Record<string, string>): Record<string, string> {
  try {
    const raw = localStorage.getItem(LEGACY_USER_API_KEYS_STORAGE);
    if (!raw) return existing;
    const parsed = JSON.parse(raw) as Record<string, string>;
    const next = { ...existing };
    const map: Record<string, string> = {
      openai: 'openai',
      claude: 'anthropic',
      grok: 'grok',
      gemini: 'gemini',
    };
    for (const [legacyKey, val] of Object.entries(parsed)) {
      const wireKey = map[legacyKey];
      if (wireKey && !next[wireKey] && val) {
        next[wireKey] = val;
      }
    }
    return next;
  } catch {
    return existing;
  }
}

export const useSovereignAiStore = create<SovereignAiState>()(
  persist(
    (set) => ({
      useAI: true,
      chatProvider: CHAT_OLYMPUS_GRID,
      voiceProvider: VOICE_OLYMPUS_GRID,
      chatKeysByProvider: {},
      chatEndpointsByProvider: {},
      voiceKeysByProvider: {},
      voiceEndpointsByProvider: {},
      schemaVersion: SCHEMA_VERSION,

      setUseAI: (value) => set({ useAI: value }),

      setChatProvider: (provider, byokKey, byokEndpoint) =>
        set((state) => {
          const normalizedKey = byokKey && byokKey.trim().length > 0 ? byokKey.trim() : null;
          const normalizedEp = byokEndpoint && byokEndpoint.trim().length > 0 ? byokEndpoint.trim() : null;
          const nextChatKeys = { ...state.chatKeysByProvider };
          const nextChatEndpoints = { ...state.chatEndpointsByProvider };
          if (normalizedKey !== null) nextChatKeys[provider] = normalizedKey;
          if (normalizedEp !== null) nextChatEndpoints[provider] = normalizedEp;
          return {
            chatProvider: provider,
            chatKeysByProvider: nextChatKeys,
            chatEndpointsByProvider: nextChatEndpoints,
          };
        }),

      setVoiceProvider: (provider, byokKey, byokEndpoint) =>
        set((state) => {
          const normalizedKey = byokKey && byokKey.trim().length > 0 ? byokKey.trim() : null;
          const normalizedEp = byokEndpoint && byokEndpoint.trim().length > 0 ? byokEndpoint.trim() : null;
          const nextVoiceKeys = { ...state.voiceKeysByProvider };
          const nextVoiceEndpoints = { ...state.voiceEndpointsByProvider };
          if (normalizedKey !== null) nextVoiceKeys[provider] = normalizedKey;
          if (normalizedEp !== null) nextVoiceEndpoints[provider] = normalizedEp;
          return {
            voiceProvider: provider,
            voiceKeysByProvider: nextVoiceKeys,
            voiceEndpointsByProvider: nextVoiceEndpoints,
          };
        }),

      clearChatByokFor: (provider) =>
        set((state) => {
          const nextKeys = { ...state.chatKeysByProvider };
          const nextEndpoints = { ...state.chatEndpointsByProvider };
          delete nextKeys[provider];
          delete nextEndpoints[provider];
          return { chatKeysByProvider: nextKeys, chatEndpointsByProvider: nextEndpoints };
        }),

      clearVoiceByokFor: (provider) =>
        set((state) => {
          const nextKeys = { ...state.voiceKeysByProvider };
          const nextEndpoints = { ...state.voiceEndpointsByProvider };
          delete nextKeys[provider];
          delete nextEndpoints[provider];
          return { voiceKeysByProvider: nextKeys, voiceEndpointsByProvider: nextEndpoints };
        }),
    }),
    {
      name: 'turtleshell-sovereign-ai',
      version: SCHEMA_VERSION,
      // On hydration, run the legacy migration IN-PLACE — pulls anything
      // from the pre-EOS-5.4 turtleshell-user-api-keys blob into the new
      // per-provider slots without wiping either.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.chatKeysByProvider = migrateLegacyKeys(state.chatKeysByProvider ?? {});
      },
    },
  ),
);

// ── Derived getters — always resolve to the CURRENT provider's slot ──

/** Currently-selected chat provider's BYOK key, or null if none stored. */
export function getChatByokKey(): string | null {
  const s = useSovereignAiStore.getState();
  const k = s.chatKeysByProvider[s.chatProvider];
  return k && k.length > 0 ? k : null;
}

/** Currently-selected chat provider's endpoint override, or null. */
export function getChatByokEndpoint(): string | null {
  const s = useSovereignAiStore.getState();
  const e = s.chatEndpointsByProvider[s.chatProvider];
  return e && e.length > 0 ? e : null;
}

/** Stored key for a SPECIFIC chat provider (regardless of current selection).
 *  Used by the ProviderChooser modal to pre-fill every row's field. */
export function getChatByokFor(provider: string): string | null {
  const s = useSovereignAiStore.getState();
  const k = s.chatKeysByProvider[provider];
  return k && k.length > 0 ? k : null;
}

export function getChatEndpointFor(provider: string): string | null {
  const s = useSovereignAiStore.getState();
  const e = s.chatEndpointsByProvider[provider];
  return e && e.length > 0 ? e : null;
}

export function getVoiceByokKey(): string | null {
  const s = useSovereignAiStore.getState();
  const k = s.voiceKeysByProvider[s.voiceProvider];
  return k && k.length > 0 ? k : null;
}

export function getVoiceByokEndpoint(): string | null {
  const s = useSovereignAiStore.getState();
  const e = s.voiceEndpointsByProvider[s.voiceProvider];
  return e && e.length > 0 ? e : null;
}

export function getVoiceByokFor(provider: string): string | null {
  const s = useSovereignAiStore.getState();
  const k = s.voiceKeysByProvider[provider];
  return k && k.length > 0 ? k : null;
}

export function getVoiceEndpointFor(provider: string): string | null {
  const s = useSovereignAiStore.getState();
  const e = s.voiceEndpointsByProvider[provider];
  return e && e.length > 0 ? e : null;
}
