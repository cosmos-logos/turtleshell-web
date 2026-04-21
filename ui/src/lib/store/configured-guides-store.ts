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

export type GuideKey = 'athena' | 'cosmos' | 'logos' | 'openai' | 'claude' | 'grok' | 'gemini' | 'custom';

interface ConfiguredGuidesStore {
  configured: string[]; // persisted as array; exposed helpers keep semantics set-like
  markConfigured: (guide: string) => void;
  isConfigured: (guide: string) => boolean;
  /** Back-fill configured set from legacy localStorage keys. Idempotent. */
  bootstrapFromLegacy: () => void;
}

const LEGACY_GUIDE_KEY = 'turtleshell-guide';
const LEGACY_API_KEYS = 'turtleshell-user-api-keys';
const BYOK_IDS: ReadonlySet<string> = new Set(['openai', 'claude', 'grok', 'gemini']);

function readLegacyGuide(): string | null {
  try {
    const v = localStorage.getItem(LEGACY_GUIDE_KEY);
    return v && v !== 'null' ? v : null;
  } catch {
    return null;
  }
}

function readLegacyBYOKIds(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_API_KEYS);
    if (!raw) return [];
    const obj = JSON.parse(raw) as Record<string, string>;
    return Object.keys(obj).filter((k) => BYOK_IDS.has(k) && !!obj[k]);
  } catch {
    return [];
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
      bootstrapFromLegacy: () => {
        const list = new Set(get().configured);
        const legacyGuide = readLegacyGuide();
        if (legacyGuide) list.add(legacyGuide);
        for (const id of readLegacyBYOKIds()) list.add(id);
        if (list.size !== get().configured.length) {
          set({ configured: [...list] });
        }
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
