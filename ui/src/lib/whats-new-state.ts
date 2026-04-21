// ui/src/lib/whats-new-state.ts
//
// Tracks when the user last saw the What's New page so the sidebar can show
// a subtle "something new" dot when there are release notes newer than the
// last visit. Simple localStorage read/write — no zustand store needed, no
// cross-component reactivity beyond the sidebar's normal re-render cadence.

const SEEN_KEY = 'turtleshell-whats-new-seen';

/** Timestamp (ms) the user last opened the What's New page. 0 if never. */
export function getWhatsNewSeenMs(): number {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Mark the What's New page as seen right now. Called on mount of the page. */
export function markWhatsNewSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    // swallow — unread badge will just stay lit, harmless
  }
}

/**
 * Is there a release note newer than the user's last visit?
 * Used by the sidebar to pulse a little green dot next to "What's New".
 */
export function hasUnreadWhatsNew(latestReleaseMs: number): boolean {
  if (latestReleaseMs <= 0) return false;
  return latestReleaseMs > getWhatsNewSeenMs();
}
