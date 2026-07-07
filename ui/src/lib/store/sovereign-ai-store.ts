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

  /** Per-provider slot metadata. Populated on saveSlot (via
   *  markChatSlotSaved / markVoiceSlotSaved), cleared on deleteSlot,
   *  hydrated on first mount by ProviderChooser's mount effect. */
  chatSlotInfo: Record<string, SlotInfo>;
  voiceSlotInfo: Record<string, SlotInfo>;

  /** Schema version for legacy migration gating. */
  schemaVersion: number;

  // ── Setters ──

  setUseAI: (value: boolean) => void;
  setChatProvider: (provider: string) => void;
  setVoiceProvider: (provider: string) => void;
  setChatEndpoint: (provider: string, endpoint: string | null) => void;
  setVoiceEndpoint: (provider: string, endpoint: string | null) => void;

  markChatSlotSaved: (provider: string, info: SlotInfo) => void;
  markVoiceSlotSaved: (provider: string, info: SlotInfo) => void;
  clearChatSlot: (provider: string) => void;
  clearVoiceSlot: (provider: string) => void;

  /** Called after IndexedDB is scanned on mount — replaces the whole
   *  category's slotInfo map with what's actually stored. Idempotent. */
  hydrateChatSlots: (info: Record<string, SlotInfo>) => void;
  hydrateVoiceSlots: (info: Record<string, SlotInfo>) => void;

  /** Set the last-test result on a slot. Called by the Test button flow. */
  recordChatTestResult: (provider: string, result: SlotInfo['lastTestResult']) => void;
  recordVoiceTestResult: (provider: string, result: SlotInfo['lastTestResult']) => void;

  /** Wipe every slot in a category — used on envelope_storage_stale
   *  server response. The corresponding IndexedDB wipe is the caller's
   *  responsibility (see secure-storage.wipeAll). */
  wipeCategoryOnRotation: (category: 'chat' | 'voice') => void;
}

const SCHEMA_VERSION = 3;

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

      markChatSlotSaved: (provider, info) =>
        set((state) => ({
          chatSlotInfo: { ...state.chatSlotInfo, [provider]: info },
        })),

      markVoiceSlotSaved: (provider, info) =>
        set((state) => ({
          voiceSlotInfo: { ...state.voiceSlotInfo, [provider]: info },
        })),

      clearChatSlot: (provider) =>
        set((state) => {
          const next = { ...state.chatSlotInfo };
          delete next[provider];
          return { chatSlotInfo: next };
        }),

      clearVoiceSlot: (provider) =>
        set((state) => {
          const next = { ...state.voiceSlotInfo };
          delete next[provider];
          return { voiceSlotInfo: next };
        }),

      hydrateChatSlots: (info) => set({ chatSlotInfo: info }),
      hydrateVoiceSlots: (info) => set({ voiceSlotInfo: info }),

      recordChatTestResult: (provider, result) =>
        set((state) => {
          const existing = state.chatSlotInfo[provider];
          if (!existing) return state;
          return {
            chatSlotInfo: {
              ...state.chatSlotInfo,
              [provider]: { ...existing, lastTestResult: result },
            },
          };
        }),

      recordVoiceTestResult: (provider, result) =>
        set((state) => {
          const existing = state.voiceSlotInfo[provider];
          if (!existing) return state;
          return {
            voiceSlotInfo: {
              ...state.voiceSlotInfo,
              [provider]: { ...existing, lastTestResult: result },
            },
          };
        }),

      wipeCategoryOnRotation: (category) =>
        set(() =>
          category === 'chat'
            ? { chatSlotInfo: {} }
            : { voiceSlotInfo: {} },
        ),
    }),
    {
      name: 'turtleshell-sovereign-ai-v2',
      version: SCHEMA_VERSION,
      // Legacy scrub — runs after localStorage rehydrate on FIRST load.
      // Any pre-v3 blob is a plaintext-storage residue and gets purged.
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
          // Any old slot info from v1/v2 schemas points at plaintext keys
          // that no longer exist — wipe the metadata so the UI shows the
          // slots as "not saved" and prompts re-entry.
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

/** True when the given category+provider has a sealed slot in IndexedDB
 *  (as reflected by the store's mirror). Cheap synchronous check for
 *  render paths. */
export function hasChatSlot(provider: string): boolean {
  return provider in useSovereignAiStore.getState().chatSlotInfo;
}

export function hasVoiceSlot(provider: string): boolean {
  return provider in useSovereignAiStore.getState().voiceSlotInfo;
}
