// lib/apply-guide-agent.ts
//
// Restore the per-user agent visibility + active-agent state on fresh login
// based on the `guideAgent` stored in the user's TurtleshellProfile__c.
//
// Background: during onboarding the user picks one of {athena, cosmos, logos,
// custom}. Onboarding.finalizeOnboarding() applies visibility changes to the
// local agent stores — sets the selected guide active, hides every other
// builtin catalog agent (Logos, Cosmos, BYOK). Those changes are persisted in
// the zustand agent-store to localStorage on the user's device.
//
// When the user signs in on a NEW device / cleared browser / incognito, that
// localStorage is gone. Without re-applying, the default active agent
// (Logos) and full visibility of all builtins (including the two the user
// explicitly didn't choose) would surprise the user. Worse, an Athena user
// would land on Logos — not on the agent they actually pay for.
//
// Call this from post-login handlers (magic-link verify + Apple sign-in) once
// the server confirms `onboardingComplete === true`. Fire-and-forget: failures
// degrade to "user sees default agents" rather than blocking the login.

import { ogRequest } from './api/olympus-grid-client';
import { useAgentStore } from './store/agent-store';
import { useChatStore } from './store/chat-store';

/**
 * Fetch the user's profile by username (derived from email) and apply their
 * saved guide-agent preference to the local stores.
 *
 * @param email the authenticated user's email — used to derive the profile
 *              username the same way Onboarding.finalizeOnboarding does
 */
export async function restoreGuideAgentFromProfile(email: string): Promise<void> {
  if (!email) return;
  const username = (email.split('@')[0] ?? '')
    .replace(/[^a-z0-9_-]/gi, '')
    .toLowerCase();
  if (!username) return;

  try {
    const profile = await ogRequest('GET', `/turtleshell/profile/${encodeURIComponent(username)}`) as {
      guideAgent?: string | null;
    };
    const guide = profile?.guideAgent;
    if (!guide) return;
    await applyGuideAgent(guide);
  } catch (err) {
    console.warn('[guide-agent] profile fetch or apply failed:', err);
  }
}

/**
 * Apply the guide-agent visibility + active-agent logic for the given guide.
 * Mirrors the branches in Onboarding.finalizeOnboarding so a returning user
 * lands in the same state they left in.
 *
 * Custom agents are not restored here — they require the original
 * `customAgent` metadata that only exists in the onboarding flow. If a
 * returning user originally picked `custom` and their per-device agent
 * definition is gone, they see the default set and can re-configure from
 * Settings → Agent Theme.
 */
export async function applyGuideAgent(guide: string): Promise<void> {
  if (guide === 'athena') {
    // Athena is sourced from the cosmos-logos sealed-envelope catalog, not
    // the builtin agent catalog. Re-run the same auto-connect + activate
    // dance Onboarding uses.
    const { autoConnectAthena, clearAthenaDisconnectFlag } = await import('./cosmos-logos/auto-connect');
    const { useCosmosLogosStore } = await import('./cosmos-logos/store');
    clearAthenaDisconnectFlag();
    await autoConnectAthena();

    const cosmosStore = useCosmosLogosStore.getState();
    const athena = cosmosStore.agents.find(a => a.manifest.identity.codename === 'athena-616');
    if (!athena) {
      console.warn('[guide-agent] Athena auto-connect failed — leaving stores untouched');
      return;
    }
    cosmosStore.setActiveChatAgent(athena.id);
    useChatStore.getState().switchAgent(athena.id);

    // Hide every builtin catalog agent so the sidebar shows Athena alone.
    const store = useAgentStore.getState();
    for (const a of store.agents) {
      if (!store.hiddenAgentIds.has(a.id)) {
        store.toggleVisibility(a.id);
      }
    }
    return;
  }

  // Builtin catalog guide (logos, cosmos, BYOK id). Unhide the chosen one
  // (BYOK agents are hidden by default) and hide every other builtin.
  const store = useAgentStore.getState();
  const builtin = store.agents.find(a => a.id === guide);
  if (!builtin) return;

  useChatStore.getState().switchAgent(guide);

  if (store.hiddenAgentIds.has(guide)) {
    store.toggleVisibility(guide);
  }
  for (const a of store.agents) {
    if (a.id !== guide && !store.hiddenAgentIds.has(a.id)) {
      store.toggleVisibility(a.id);
    }
  }
}
