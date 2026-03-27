import type { CosmosLogosManifest } from './types'

export interface FetchManifestResult {
  manifest: CosmosLogosManifest
  versionSupported: string
  /** The resolved live endpoint to ping/connect to (= manifest.network.endpoint) */
  agentUrl: string
}

/**
 * Resolve user input to a manifest URL.
 *
 * Accepts:
 *   - Full URL:            http://localhost:3801
 *   - GitHub short form:   cosmos-logos/thoth
 *   - GitHub URL:          https://github.com/cosmos-logos/thoth
 *
 * GitHub paths resolve to the raw manifest on the default branch.
 * The live endpoint is then read from manifest.network.endpoint.
 */
export function resolveManifestUrl(input: string): { manifestUrl: string; isGitHub: boolean } {
  const trimmed = input.trim().replace(/\/+$/, '')

  // Full github.com URL
  if (trimmed.startsWith('https://github.com/') || trimmed.startsWith('http://github.com/')) {
    const path = trimmed.replace(/^https?:\/\/github\.com\//, '')
    return {
      manifestUrl: `https://raw.githubusercontent.com/${path}/HEAD/.well-known/cosmos-logos.json`,
      isGitHub: true,
    }
  }

  // Short owner/repo form (no slashes beyond the one separator, no protocol)
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return {
      manifestUrl: `https://raw.githubusercontent.com/${trimmed}/HEAD/.well-known/cosmos-logos.json`,
      isGitHub: true,
    }
  }

  // Direct URL — append well-known path
  return {
    manifestUrl: `${trimmed}/.well-known/cosmos-logos.json`,
    isGitHub: false,
  }
}

export async function fetchManifest(input: string): Promise<FetchManifestResult> {
  const { manifestUrl, isGitHub } = resolveManifestUrl(input)

  const response = await fetch(manifestUrl, {
    cache: 'no-cache',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: ${response.status}`)
  }

  const manifest = await response.json()
  validateManifest(manifest)

  // For GitHub-sourced manifests the live URL comes from the manifest itself.
  // For direct URLs the caller's input is already the live endpoint.
  const agentUrl = isGitHub
    ? manifest.network.endpoint.replace(/\/+$/, '')
    : input.trim().replace(/\/+$/, '')

  return {
    manifest,
    versionSupported: manifest.cosmos_logos_version ?? '1.0',
    agentUrl,
  }
}

export async function pingAgent(agentUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${agentUrl.replace(/\/+$/, '')}/ping`, {
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function healthCheck(agentUrl: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${agentUrl.replace(/\/+$/, '')}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * POST the user-supplied setup field values to the agent's apply_endpoint.
 * Non-fatal — if the agent doesn't implement /api/setup yet, we silently continue.
 */
export async function applySetup(
  agentUrl: string,
  applyEndpoint: string,
  values: Record<string, string>,
): Promise<void> {
  try {
    const url = `${agentUrl.replace(/\/+$/, '')}${applyEndpoint}`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    // best-effort — agent may not implement /api/setup yet
  }
}

function validateManifest(m: unknown): asserts m is CosmosLogosManifest {
  const manifest = m as any
  if (!manifest?.cosmos_logos_version) throw new Error('Missing cosmos_logos_version')
  if (!manifest?.identity?.codename) throw new Error('Missing identity.codename')
  if (!manifest?.identity?.name) throw new Error('Missing identity.name')
  if (!manifest?.network?.endpoint) throw new Error('Missing network.endpoint')
  if (!manifest?.cryptography?.public_key) throw new Error('Missing cryptography.public_key')
  if (!Array.isArray(manifest?.capabilities) || manifest.capabilities.length === 0) {
    throw new Error('Missing or empty capabilities')
  }
}
