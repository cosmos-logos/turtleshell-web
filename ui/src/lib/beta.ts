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
import { hasUserApiKey } from '@/lib/store/agent-store';

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
  if (testBetaEnabled) return true;
  if (ALWAYS_VISIBLE_BUILTIN_AGENT_IDS.has(agentId)) return true;
  if (BYOK_AGENT_IDS.has(agentId) && hasUserApiKey(agentId)) return true;
  return false;
}

/** Should this cosmos-logos agent be visible right now? */
export function isCosmosAgentVisibleInBeta(
  codename: string | undefined | null,
  testBetaEnabled: boolean,
): boolean {
  if (testBetaEnabled) return true;
  return isAlwaysVisibleCosmosCodename(codename);
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
