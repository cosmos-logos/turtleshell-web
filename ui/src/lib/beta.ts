// ui/src/lib/beta.ts
//
// Test Beta Features gate — single source of truth for "what is hidden from
// regular signups vs. visible to beta/dev testers".
//
// Default for every new signup is `testBetaEnabled === false`. In that state,
// the UI intentionally shows only the minimum surface: the core three agents
// (Cosmos, Logos, Athena), and a stripped-down nav (Chat / History / Memory /
// Sea Shells / Docs / Settings). Toggling beta ON (under Settings → Developer)
// reveals everything else.
//
// Design notes:
//   - Separate concern from `hiddenAgentIds` (user's Eye/EyeOff choice).
//     Compose as: visible = !user-hidden && (beta || alwaysVisible).
//   - "Athena" here = any cosmos-logos connected agent whose codename starts
//     with `athena-` (e.g. athena-616, athena-717, athena-303). This matches
//     how the fleet is deployed — the user's olympus-grid account auto-wires
//     at least one athena instance.

import { useEnvironmentStore } from '@/lib/store/environment-store';
import { isGuideConfigured } from '@/lib/store/configured-guides-store';

/** Built-in agent IDs that are always visible, regardless of beta state. */
export const ALWAYS_VISIBLE_BUILTIN_AGENT_IDS: ReadonlySet<string> = new Set([
  'cosmos',
  'logos',
]);

/** BYOK agent IDs — their visibility follows whether the user entered a key. */
const BYOK_AGENT_IDS: ReadonlySet<string> = new Set(['openai', 'claude', 'grok', 'gemini']);

/**
 * Is this cosmos-logos connected agent always visible?
 * True for any Athena / Cosmos / Logos family instance — the three core
 * bundled agents share Athena's endpoint and ride the same go-live path.
 */
export function isAlwaysVisibleCosmosCodename(codename: string | undefined | null): boolean {
  if (!codename) return false;
  if (codename === 'athena' || codename.startsWith('athena-')) return true;
  if (codename === 'cosmos' || codename.startsWith('cosmos-')) return true;
  if (codename === 'logos' || codename.startsWith('logos-')) return true;
  return false;
}

/** Hook — reactively read the beta-enabled flag. */
export function useTestBetaEnabled(): boolean {
  return useEnvironmentStore((s) => s.testBetaEnabled);
}

/**
 * Should this built-in agent be visible right now?
 * Combines beta state with the always-visible allowlist, plus a BYOK
 * carve-out: once the user enters an API key for a provider, that provider's
 * agent becomes visible regardless of beta — picking it in onboarding is an
 * explicit opt-in to see it in the sidebar/picker.
 */
export function isBuiltinAgentVisibleInBeta(
  agentId: string,
  testBetaEnabled: boolean,
): boolean {
  // BYOK agents are gated on explicit guide configuration only. A saved
  // API key is NOT required for visibility: a user who configured Gemini
  // in onboarding but then had keys wiped on logout (security flow) still
  // has an opinion about which guide is theirs — they can use it via the
  // server-proxied Athena path and re-enter their key in Change Guide any
  // time. Conversely, a stale key in localStorage for a provider the user
  // never picked stays invisible.
  //
  // The check runs BEFORE `testBetaEnabled` so beta can't leak unconfigured
  // providers into the picker.
  if (BYOK_AGENT_IDS.has(agentId)) {
    return isGuideConfigured(agentId);
  }
  if (testBetaEnabled) return true;
  if (ALWAYS_VISIBLE_BUILTIN_AGENT_IDS.has(agentId)) return true;
  return false;
}

/** Should this cosmos-logos agent be visible right now? */
export function isCosmosAgentVisibleInBeta(
  codename: string | undefined | null,
  testBetaEnabled: boolean,
): boolean {
  // Guide-family cosmos-logos agents (athena / cosmos / logos) follow the
  // configured-guide rule regardless of beta. Beta still reveals non-guide
  // cosmos-logos agents (thoth, poseidon, homework-buddy, etc.) as before.
  if (codename && (
    codename === 'athena' || codename.startsWith('athena-') ||
    codename === 'cosmos' || codename.startsWith('cosmos-') ||
    codename === 'logos'  || codename.startsWith('logos-')
  )) {
    return isCosmosCodenameConfigured(codename);
  }
  if (testBetaEnabled) return true;
  return isAlwaysVisibleCosmosCodename(codename);
}

/**
 * Is a cosmos-logos agent's codename bound to a configured guide?
 * Maps athena/cosmos/logos family codenames to their guide keys so a user
 * who only set up Athena sees Athena in the sidebar but not Cosmos/Logos,
 * even though all three are auto-connected in the cosmos-logos store on
 * boot. Non-guide cosmos-logos codenames (thoth, poseidon, etc.) pass
 * through — their visibility is governed by the user's eye-toggle instead.
 */
export function isCosmosCodenameConfigured(codename: string | undefined | null): boolean {
  if (!codename) return true;
  if (codename === 'athena' || codename.startsWith('athena-')) return isGuideConfigured('athena');
  if (codename === 'cosmos' || codename.startsWith('cosmos-')) return isGuideConfigured('cosmos');
  if (codename === 'logos' || codename.startsWith('logos-')) return isGuideConfigured('logos');
  return true;
}

/**
 * Guide keys exposed during onboarding when beta is OFF.
 * BYOK guides (claude/openai/grok/gemini) and the "make your own" custom guide
 * are hidden for non-beta users to keep the first-run experience simple.
 */
export const ALWAYS_VISIBLE_GUIDE_KEYS: ReadonlySet<string> = new Set([
  'athena',
  'cosmos',
  'logos',
]);

export function isGuideVisibleInBeta(
  guideKey: string,
  testBetaEnabled: boolean,
): boolean {
  if (testBetaEnabled) return true;
  return ALWAYS_VISIBLE_GUIDE_KEYS.has(guideKey);
}
