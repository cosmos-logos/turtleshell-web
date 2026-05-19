// Tracks which guides the user has explicitly set up (athena / cosmos / logos
// / openai / claude / grok / gemini / custom). Populated by onboarding's
// finalize step and by the Settings → Change Guide flow.
//
// This is an ADDITIVE filter on top of the existing hiddenAgentIds + beta-
// visibility logic. A guide must be configured to appear in the sidebar or
// picker dropdown; the user's manual eye-toggle on top can still hide a
// configured guide.
//
// Persisted to localStorage. Bootstrapped on first load from legacy single-
// guide state (`turtleshell-guide` + `turtleshell-user-api-keys`) so users
// who onboarded before this feature shipped don't lose their setup.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ogRequest } from '@/lib/api/olympus-grid-client';

export type GuideKey = 'athena' | 'cosmos' | 'logos' | 'openai' | 'claude' | 'grok' | 'gemini' | 'custom';

interface ConfiguredGuidesStore {
  configured: string[]; // persisted as array; exposed helpers keep semantics set-like
  markConfigured: (guide: string) => void;
  isConfigured: (guide: string) => boolean;
  /** Seed from an authoritative server list (TurtleshellProfile.ProfileData.configuredGuides). Union with local. */
  seedFromServer: (server: string[]) => void;
  /** Back-fill configured set from legacy localStorage keys. Idempotent. */
  bootstrapFromLegacy: () => void;
}

const LEGACY_GUIDE_KEY = 'turtleshell-guide';
const BYOK_IDS: ReadonlySet<string> = new Set(['openai', 'claude', 'grok', 'gemini']);

function readLegacyGuide(): string | null {
  try {
    const v = localStorage.getItem(LEGACY_GUIDE_KEY);
    return v && v !== 'null' ? v : null;
  } catch {
    return null;
  }
}

export const useConfiguredGuidesStore = create<ConfiguredGuidesStore>()(
  persist(
    (set, get) => ({
      configured: [],
      markConfigured: (guide: string) => {
        const list = get().configured;
        if (list.includes(guide)) return;
        set({ configured: [...list, guide] });
      },
      isConfigured: (guide: string) => get().configured.includes(guide),
      seedFromServer: (server) => {
        // Union local + server, preserving local order first, then any
        // server entries we didn't already have. This keeps the user's
        // current-device "last-added" ordering while restoring entries they
        // configured on another device.
        const prev = get().configured;
        const merged = [...prev];
        for (const g of server) {
          if (typeof g === 'string' && !merged.includes(g)) merged.push(g);
        }
        if (merged.length !== prev.length) set({ configured: merged });
      },
      bootstrapFromLegacy: () => {
        // Only trust the single `turtleshell-guide` pointer from the old
        // onboarding flow. Do NOT auto-mark every saved BYOK api-key as
        // configured: a user may have keys saved from prior test sessions
        // for providers they never actually chose as a guide. Those keys
        // stay inert until the user walks through Settings → Change Guide.
        //
        // Corrective sweep for affected users: if the legacy guide pointer
        // is a BYOK id (i.e. the user's original onboarding pick WAS a
        // BYOK), strip any OTHER BYOK ids from `configured` that got
        // auto-added by an earlier buggy bootstrap. Cosmos/logos/athena
        // entries are left alone — they're guide-family agents always
        // connected in the cosmos-logos store and governed by their own
        // filter.
        const current = new Set(get().configured);
        const legacyGuide = readLegacyGuide();
        if (legacyGuide && BYOK_IDS.has(legacyGuide)) {
          for (const id of [...current]) {
            if (BYOK_IDS.has(id) && id !== legacyGuide) {
              current.delete(id);
            }
          }
        }
        if (legacyGuide) current.add(legacyGuide);
        const next = [...current];
        const prev = get().configured;
        const changed = next.length !== prev.length || next.some((x) => !prev.includes(x));
        if (changed) set({ configured: next });
      },
    }),
    { name: 'turtleshell-configured-guides' },
  ),
);

/** Non-hook helper — read outside React components. */
export function isGuideConfigured(guide: string | null | undefined): boolean {
  if (!guide) return false;
  return useConfiguredGuidesStore.getState().isConfigured(guide);
}

export function markGuideConfigured(guide: string): void {
  useConfiguredGuidesStore.getState().markConfigured(guide);
}

/**
 * Persist the local `configuredGuides` array to TurtleshellProfile.ProfileData
 * so the roster survives logout / new-device sign-in. Fire-and-forget —
 * the local state is the truth for the current session; server sync is a
 * convenience for next login.
 *
 * Read-modify-write: fetch the current profileData blob, union our new
 * `configuredGuides` key, PUT it back. Done this way because the Apex PUT
 * handler overwrites ProfileData__c wholesale when `profileData` is in the
 * body, so we have to preserve the other FE-owned keys (avatar, guidePublic,
 * guideEndpoint, links, etc.) explicitly.
 */
export async function syncConfiguredGuidesToProfile(): Promise<void> {
  try {
    // Migrated 2026-05-18 to /v1/grid/master/app/profile/turtleshell-web/me.
    // Identity-scoped via JWT (no username segment). Could be simplified
    // to a flat-style {configuredGuides} delta thanks to RFC 7396 merge,
    // but keeping the read-then-write pattern for now since the existing
    // shape works under both contracts.
    const env = (await ogRequest('GET', `/app/profile/turtleshell-web/me`)) as {
      profileData?: Record<string, unknown>;
    } | null;
    const prev = (env?.profileData && typeof env.profileData === 'object')
      ? env.profileData
      : {};
    const configured = useConfiguredGuidesStore.getState().configured;
    const nextProfileData: Record<string, unknown> = { ...prev, configuredGuides: configured };
    await ogRequest('PUT', `/app/profile/turtleshell-web/me`, {
      profileData: nextProfileData,
    });
  } catch (err) {
    console.warn('[configuredGuides] server sync failed', err);
  }
}
