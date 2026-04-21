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
import { markGuideConfigured, useConfiguredGuidesStore } from './store/configured-guides-store';

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
      profileData?: { configuredGuides?: unknown };
    };

    // Seed the configured-guides store from the server-side roster BEFORE
    // running applyGuideAgent so the sidebar/picker re-render with every
    // guide the user has ever set up — not just the single server-side
    // `guideAgent`. The server's configuredGuides is the source of truth
    // for multi-guide persistence across logout / new-device sign-in.
    const serverConfigured = profile?.profileData?.configuredGuides;
    if (Array.isArray(serverConfigured) && serverConfigured.length > 0) {
      const clean = serverConfigured.filter((g): g is string => typeof g === 'string');
      useConfiguredGuidesStore.getState().seedFromServer(clean);
    }

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
  // Fresh-device restore: the server-side profile only knows one `guideAgent`.
  // Also backfill the local configured-guides set from any legacy localStorage
  // so users coming from pre-Change-Guide builds don't lose their roster.
  useConfiguredGuidesStore.getState().bootstrapFromLegacy();
  markGuideConfigured(guide);

  if (guide === 'athena' || guide === 'cosmos' || guide === 'logos') {
    // Athena / Cosmos / Logos live in the cosmos-logos sealed-envelope
    // catalog, not the builtin agent catalog. They all run on Athena's
    // chat endpoint with different bundled manifests (system_prompt +
    // voice). Re-run the same auto-connect + activate dance Onboarding
    // uses, keyed on the guide the user picked.
    const autoConnect = await import('./cosmos-logos/auto-connect');
    const { useCosmosLogosStore } = await import('./cosmos-logos/store');

    const matchCodename = guide === 'athena' ? 'athena-616' : guide;

    if (guide === 'athena') {
      autoConnect.clearAthenaDisconnectFlag();
      await autoConnect.autoConnectAthena();
    } else if (guide === 'cosmos') {
      autoConnect.clearCosmosDisconnectFlag();
      await autoConnect.autoConnectCosmos();
    } else {
      autoConnect.clearLogosDisconnectFlag();
      await autoConnect.autoConnectLogos();
    }

    const cosmosStore = useCosmosLogosStore.getState();
    const connected = cosmosStore.agents.find(a => a.manifest.identity.codename === matchCodename);
    if (!connected) {
      console.warn(`[guide-agent] ${guide} auto-connect failed — leaving stores untouched`);
      return;
    }
    cosmosStore.setActiveChatAgent(connected.id);
    useChatStore.getState().switchAgent(connected.id);

    // Hide every other catalog agent so the sidebar shows the chosen guide
    // alone. hiddenAgentIds is shared across stores, so skip builtin IDs that
    // collide with a cosmos-logos codename — the picker/sidebar dedupe those
    // at render time when a cosmos-logos cousin exists.
    const cosmosCodenames = new Set(cosmosStore.agents.map(a => a.manifest.identity.codename));
    const store = useAgentStore.getState();
    for (const a of store.agents) {
      if (cosmosCodenames.has(a.id)) continue;
      if (!store.hiddenAgentIds.has(a.id)) {
        store.toggleVisibility(a.id);
      }
    }
    for (const a of cosmosStore.agents) {
      if (a.id === connected.id) continue;
      if (!store.hiddenAgentIds.has(a.id)) {
        store.toggleVisibility(a.id);
      }
    }
    // Safety net for legacy state: older onboarding runs hid builtin
    // cosmos/logos IDs, which also masks the cosmos-logos cousins since
    // IDs collide. Force-unhide the selected agent's ID so restoration
    // recovers users coming from the buggy state without a manual reset.
    if (store.hiddenAgentIds.has(connected.id)) {
      store.toggleVisibility(connected.id);
    }
    return;
  }

  // Builtin catalog guide — BYOK (openai/claude/grok/gemini). Clear any
  // cosmos-logos active selection first so the picker/header don't render
  // a stale cosmos-logos persona on top of the BYOK choice. Then unhide the
  // selected BYOK agent, hide every other builtin, and hide all cosmos-logos
  // entries (Athena/Cosmos/Logos) so the sidebar shows a single-agent UI.
  const { useCosmosLogosStore } = await import('./cosmos-logos/store');
  const cosmosStore = useCosmosLogosStore.getState();
  cosmosStore.setActiveChatAgent(null);

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
  for (const a of cosmosStore.agents) {
    if (!store.hiddenAgentIds.has(a.id)) {
      store.toggleVisibility(a.id);
    }
  }
}
