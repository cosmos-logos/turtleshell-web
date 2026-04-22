import type { CosmosLogosManifest } from '@/lib/cosmos-logos/types';
import cosmos from './cosmos.json';
import logos from './logos.json';
import openai from './openai.json';
import claude from './claude.json';
import grok from './grok.json';
import gemini from './gemini.json';
import athenaRaw from './athena.json';

/**
 * In dev builds (Vite DEV mode), rewrite any trusted_tool_server URLs
 * from production (api-int.turtleshell.ai) to local (localhost:3431)
 * so the Tools flow can exercise a locally-running Poseidon without
 * editing the bundled JSON. Prod builds pass through untouched.
 *
 * This only rewrites manifest_url + mcp_url on tool-server entries.
 * Network endpoints for the agent itself stay as-bundled — the chat
 * endpoint's local override is already handled by
 * useEnvironmentStore.getBaseUrl().
 */
function localizeForDev(m: CosmosLogosManifest): CosmosLogosManifest {
  if (!import.meta.env.DEV) return m;
  if (!m.trusted_tool_servers || m.trusted_tool_servers.length === 0) return m;
  const rewrite = (u: string) =>
    u.replace(/^https:\/\/api-int\.turtleshell\.ai/, 'http://localhost:3431');
  return {
    ...m,
    trusted_tool_servers: m.trusted_tool_servers.map((t) => ({
      ...t,
      manifest_url: rewrite(t.manifest_url),
      mcp_url: rewrite(t.mcp_url),
    })),
  };
}

export const BUNDLED_MANIFESTS = {
  cosmos: localizeForDev(cosmos as CosmosLogosManifest),
  logos: localizeForDev(logos as CosmosLogosManifest),
  openai: openai as CosmosLogosManifest,
  claude: claude as CosmosLogosManifest,
  grok: grok as CosmosLogosManifest,
  gemini: gemini as CosmosLogosManifest,
  athena: localizeForDev(athenaRaw as CosmosLogosManifest),
} as const;

export type BundledManifestKey = keyof typeof BUNDLED_MANIFESTS;

export function getManifest(key: BundledManifestKey): CosmosLogosManifest {
  return BUNDLED_MANIFESTS[key];
}

/**
 * Resolve a manifest for an agent id. Falls back to null when we
 * don't have one bundled — callers should treat "no manifest" as
 * "no trusted_tool_servers", i.e. the Tools page shows empty.
 * Athena's id in the chat system is `athena`; cosmos/logos have
 * their own built-in manifests; BYOK providers use their bundled
 * key (openai/claude/grok/gemini).
 */
export function getManifestForAgentId(agentId: string): CosmosLogosManifest | null {
  // Athena runs on several instances (athena-616, athena-717, etc.)
  // — they all share the same trust policy from the bundled manifest.
  if (agentId === 'athena' || agentId.startsWith('athena-')) {
    return BUNDLED_MANIFESTS.athena;
  }
  if (agentId in BUNDLED_MANIFESTS) {
    return BUNDLED_MANIFESTS[agentId as BundledManifestKey];
  }
  return null;
}
