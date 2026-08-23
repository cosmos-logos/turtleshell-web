// src/lib/store/sovereign-ai-store.ts
//
// Sovereign AI settings — Version 2 (no-plaintext-anywhere) store.
//
// Steward directive 2026-07-07: BYOK keys are NEVER stored in plaintext on
// the client. This store therefore holds:
//   • Non-secret UI state: useAI flag, current chatProvider / voiceProvider,
//     Ollama / XTTS endpoint URLs, per-provider slot metadata.
//   • NOT the BYOK keys. Those live as sealed ciphertext in IndexedDB
//     (see src/lib/sovereign-ai/secure-storage.ts).
//
// Public API from the caller's POV:
//   • Read what provider is selected: chatProvider / voiceProvider
//   • Read an endpoint (non-secret): chatEndpointFor / voiceEndpointFor
//   • Query slot presence: hasChatSlot / hasVoiceSlot (used to render the
//     ProviderChooser "Saved" state without touching IndexedDB every render)
//   • Mutate: setChatProvider / setVoiceProvider / setChatEndpoint / etc.
//   • Coordinate with IndexedDB: markChatSlotSaved (call after saveSlot),
//     clearChatSlot (call after deleteSlot), wipeCategoryOnRotation.
//
// Legacy plaintext scrub — on first load with schemaVersion < 3, we delete
// the v1 turtleshell-sovereign-ai localStorage blob and the pre-EOS-5.4
// turtleshell-user-api-keys blob. Existing users re-paste their keys with
// the ceremony flow. This is the deliberate cost of the "no plaintext"
// property.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { scrubLegacyPlaintextStorage } from '@/lib/sovereign-ai/secure-storage';

export const CHAT_OLYMPUS_GRID = 'olympus-grid';
export const VOICE_OLYMPUS_GRID = 'olympus-grid';

/** Non-secret display metadata for a saved slot. Mirrors the IndexedDB
 *  StoredSlot but WITHOUT the storedInner ciphertext — the store's job is
 *  UI reactivity, not persistence-of-secrets. */
export interface SlotInfo {
  /** ISO timestamp of when the user pasted + sealed. */
  savedAt: string;
  /** Manifest identity.codename at seal time (e.g. "athena-616"). */
  godRecipient: string;
  /** First 12 chars of the manifest fingerprint at seal time, for display
   *  in the ceremony UI's "Sealed for" panel. */
  fingerprintShort: string;
  /** Result of the last Test button run against /v1/{god}/byok/test.
   *  Undefined = never tested. */
  lastTestResult?: {
    ok: boolean;
    testedAt: string;
    tookMs?: number;
    error?: string;
  };
}

/** v3 agent-scoped slot info shape: godFp → provider → SlotInfo. Each
 *  agent (identified by pubkey fingerprint) has its own independent
 *  credential silo. Steward directive 2026-07-09. */
export type ScopedSlotInfo = Record<string, Record<string, SlotInfo>>;

interface SovereignAiState {
  /** Whether AI is turned on at all. When false, chat/voice surfaces should
   *  refuse to invoke inference. Non-LLM capabilities keep working. */
  useAI: boolean;

  chatProvider: string;
  voiceProvider: string;

  /** Non-secret endpoints (Ollama URL, XTTS URL). These are user-facing
   *  addresses — treating them as secrets would be theater; they typically
   *  point at localhost or a Tailscale-visible host. Stored per-provider so
   *  users can keep an XTTS URL and an Ollama URL configured simultaneously. */
  chatEndpointsByProvider: Record<string, string>;
  voiceEndpointsByProvider: Record<string, string>;

  /** v3 agent-scoped slot metadata. Outer key = god pubkey fingerprint;
   *  inner map = provider → SlotInfo. Two agents with different pubkeys
   *  have wholly independent silos. Populated on saveSlot, cleared on
   *  deleteSlot, hydrated on ProviderChooser open. */
  chatSlotInfo: ScopedSlotInfo;
  voiceSlotInfo: ScopedSlotInfo;

  /** Schema version for legacy migration gating. */
  schemaVersion: number;

  // ── Setters ──

  setUseAI: (value: boolean) => void;
  setChatProvider: (provider: string) => void;
  setVoiceProvider: (provider: string) => void;
  setChatEndpoint: (provider: string, endpoint: string | null) => void;
  setVoiceEndpoint: (provider: string, endpoint: string | null) => void;

  markChatSlotSaved: (godFp: string, provider: string, info: SlotInfo) => void;
  markVoiceSlotSaved: (godFp: string, provider: string, info: SlotInfo) => void;
  clearChatSlot: (godFp: string, provider: string) => void;
  clearVoiceSlot: (godFp: string, provider: string) => void;

  /** Called after IndexedDB is scanned on mount — replaces the whole
   *  category's slotInfo map for a SPECIFIC god with what's actually
   *  stored. Called with the current god's fingerprint on chooser open. */
  hydrateChatSlots: (godFp: string, info: Record<string, SlotInfo>) => void;
  hydrateVoiceSlots: (godFp: string, info: Record<string, SlotInfo>) => void;

  /** Set the last-test result on a slot. Called by the Test button flow. */
  recordChatTestResult: (godFp: string, provider: string, result: SlotInfo['lastTestResult']) => void;
  recordVoiceTestResult: (godFp: string, provider: string, result: SlotInfo['lastTestResult']) => void;

  /** Wipe every slot for a god in a category — used on envelope_storage_stale
   *  server response. The corresponding IndexedDB wipe is the caller's
   *  responsibility (see secure-storage.wipeAll). */
  wipeCategoryOnRotation: (godFp: string, category: 'chat' | 'voice') => void;
}

const SCHEMA_VERSION = 4;

export const useSovereignAiStore = create<SovereignAiState>()(
  persist(
    (set) => ({
      useAI: true,
      chatProvider: CHAT_OLYMPUS_GRID,
      voiceProvider: VOICE_OLYMPUS_GRID,
      chatEndpointsByProvider: {},
      voiceEndpointsByProvider: {},
      chatSlotInfo: {},
      voiceSlotInfo: {},
      schemaVersion: SCHEMA_VERSION,

      setUseAI: (value) => set({ useAI: value }),

      setChatProvider: (provider) => set({ chatProvider: provider }),
      setVoiceProvider: (provider) => set({ voiceProvider: provider }),

      setChatEndpoint: (provider, endpoint) =>
        set((state) => {
          const next = { ...state.chatEndpointsByProvider };
          if (endpoint && endpoint.trim().length > 0) {
            next[provider] = endpoint.trim();
          } else {
            delete next[provider];
          }
          return { chatEndpointsByProvider: next };
        }),

      setVoiceEndpoint: (provider, endpoint) =>
        set((state) => {
          const next = { ...state.voiceEndpointsByProvider };
          if (endpoint && endpoint.trim().length > 0) {
            next[provider] = endpoint.trim();
          } else {
            delete next[provider];
          }
          return { voiceEndpointsByProvider: next };
        }),

      markChatSlotSaved: (godFp, provider, info) =>
        set((state) => ({
          chatSlotInfo: {
            ...state.chatSlotInfo,
            [godFp]: {
              ...(state.chatSlotInfo[godFp] ?? {}),
              [provider]: info,
            },
          },
        })),

      markVoiceSlotSaved: (godFp, provider, info) =>
        set((state) => ({
          voiceSlotInfo: {
            ...state.voiceSlotInfo,
            [godFp]: {
              ...(state.voiceSlotInfo[godFp] ?? {}),
              [provider]: info,
            },
          },
        })),

      clearChatSlot: (godFp, provider) =>
        set((state) => {
          const godMap = state.chatSlotInfo[godFp];
          if (!godMap) return state;
          const nextGod = { ...godMap };
          delete nextGod[provider];
          const nextAll = { ...state.chatSlotInfo };
          if (Object.keys(nextGod).length === 0) delete nextAll[godFp];
          else nextAll[godFp] = nextGod;
          return { chatSlotInfo: nextAll };
        }),

      clearVoiceSlot: (godFp, provider) =>
        set((state) => {
          const godMap = state.voiceSlotInfo[godFp];
          if (!godMap) return state;
          const nextGod = { ...godMap };
          delete nextGod[provider];
          const nextAll = { ...state.voiceSlotInfo };
          if (Object.keys(nextGod).length === 0) delete nextAll[godFp];
          else nextAll[godFp] = nextGod;
          return { voiceSlotInfo: nextAll };
        }),

      hydrateChatSlots: (godFp, info) =>
        set((state) => ({
          chatSlotInfo: { ...state.chatSlotInfo, [godFp]: info },
        })),

      hydrateVoiceSlots: (godFp, info) =>
        set((state) => ({
          voiceSlotInfo: { ...state.voiceSlotInfo, [godFp]: info },
        })),

      recordChatTestResult: (godFp, provider, result) =>
        set((state) => {
          const existing = state.chatSlotInfo[godFp]?.[provider];
          if (!existing) return state;
          return {
            chatSlotInfo: {
              ...state.chatSlotInfo,
              [godFp]: {
                ...state.chatSlotInfo[godFp]!,
                [provider]: { ...existing, lastTestResult: result },
              },
            },
          };
        }),

      recordVoiceTestResult: (godFp, provider, result) =>
        set((state) => {
          const existing = state.voiceSlotInfo[godFp]?.[provider];
          if (!existing) return state;
          return {
            voiceSlotInfo: {
              ...state.voiceSlotInfo,
              [godFp]: {
                ...state.voiceSlotInfo[godFp]!,
                [provider]: { ...existing, lastTestResult: result },
              },
            },
          };
        }),

      wipeCategoryOnRotation: (godFp, category) =>
        set((state) => {
          if (category === 'chat') {
            const next = { ...state.chatSlotInfo };
            delete next[godFp];
            return { chatSlotInfo: next };
          } else {
            const next = { ...state.voiceSlotInfo };
            delete next[godFp];
            return { voiceSlotInfo: next };
          }
        }),
    }),
    {
      name: 'turtleshell-sovereign-ai-v3',
      version: SCHEMA_VERSION,
      // Steward 2026-07-09: schema v3 → v4 is the agent-scoping migration.
      // Pre-v4 slotInfo maps were `Record<provider, SlotInfo>` — no godFp
      // dimension. The IDB records those referenced are also being wiped
      // (see secure-storage.ts DB_VERSION=2 upgrade). So on a v4 boot with
      // stale slotInfo shape, we wipe both dimensions to a clean state and
      // let users re-paste with the agent-scoped ceremony.
      onRehydrateStorage: () => (state) => {
        const scrubbed = scrubLegacyPlaintextStorage();
        if (scrubbed.wipedKeys.length > 0) {
          // eslint-disable-next-line no-console
          console.log(
            '[sovereign-ai] Scrubbed legacy plaintext storage:',
            scrubbed.wipedKeys.join(', '),
            '- your keys will need to be re-entered under the new sealed-storage flow.',
          );
        }
        if (state && state.schemaVersion < SCHEMA_VERSION) {
          state.schemaVersion = SCHEMA_VERSION;
          state.chatSlotInfo = {};
          state.voiceSlotInfo = {};
        }
      },
    },
  ),
);

// ─── Non-secret derived readers (safe from any surface) ───

export function getChatEndpointFor(provider: string): string | null {
  const s = useSovereignAiStore.getState();
  const e = s.chatEndpointsByProvider[provider];
  return e && e.length > 0 ? e : null;
}

export function getVoiceEndpointFor(provider: string): string | null {
  const s = useSovereignAiStore.getState();
  const e = s.voiceEndpointsByProvider[provider];
  return e && e.length > 0 ? e : null;
}

/** True when the given god+category+provider has a sealed slot in
 *  IndexedDB (as reflected by the store's mirror). Cheap synchronous
 *  check for render paths. v3: scoped to the god fingerprint so each
 *  agent's silo is independently queryable. */
export function hasChatSlot(godFp: string, provider: string): boolean {
  return provider in (useSovereignAiStore.getState().chatSlotInfo[godFp] ?? {});
}

export function hasVoiceSlot(godFp: string, provider: string): boolean {
  return provider in (useSovereignAiStore.getState().voiceSlotInfo[godFp] ?? {});
}
