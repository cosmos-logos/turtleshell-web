export interface CosmosLogosSetupField {
  key: string
  label: string
  description?: string
  type: 'text' | 'path' | 'secret' | 'url' | 'number' | 'boolean'
  default?: string
  required: boolean
  placeholder?: string
}

export interface CosmosLogosSetup {
  apply_endpoint: string
  fields: CosmosLogosSetupField[]
}

export interface CosmosLogosManifest {
  cosmos_logos_version: string
  identity: {
    name: string
    codename: string
    purpose?: string
    description?: string
    system_prompt?: string  // injected as the LLM system message when this agent handles chat
    version: string
    repo?: string
    maintainers?: string[]
  }
  display?: {
    icon_url?: string
    color?: string
    homepage?: string  // public project/repo URL — NOT used for iframe embedding
    app_url?: string   // URL TurtleShell loads in the iframe (defaults to network.endpoint)
    visible?: boolean  // whether agent appears in sidebar/picker by default (default true). Background services set false.
  }
  /** Voice identity for TTS — defines how this agent sounds when speaking */
  voice?: {
    /** Human-readable description of the voice character */
    description?: string
    /** Per-engine voice mappings. Key = engine name, value = engine-specific config */
    engines: Record<string, {
      voice_id: string
      model?: string
      [key: string]: unknown  // forward-compatible with future engine params
    }>
    /** Default engine preference (e.g. 'openai', 'elevenlabs') */
    preferred_engine?: string
  }
  network: {
    endpoint: string
    health?: string
    well_known?: string
  }
  cryptography: {
    algorithm: string
    public_key: string
    fingerprint?: string
    signing_header: string
    timestamp_header: string
  }
  capabilities: CosmosLogosCapability[]
  setup?: CosmosLogosSetup
  trust: {
    ttl?: number
    agents: TrustEntry[]
  }
  /**
   * Tool servers the agent has explicitly whitelisted. Users can only
   * add a tool to an agent if that tool's codename appears here — this
   * is the trust boundary that stops arbitrary MCP servers from being
   * bolted onto an agent. Each entry declares the onboarding ceremony
   * the UI should run (OAuth, BYOK, etc.) and the manifest URL whose
   * cryptography.public_key is used to seal the resulting credentials.
   */
  trusted_tool_servers?: TrustedToolServer[]
  envelope?: {
    enabled?: boolean
    header?: string
    max_size_bytes?: number
    context_types?: string[]
  }
  metadata?: {
    tags?: string[]
    created?: string
    updated?: string
    license?: string
  }
}

export interface CosmosLogosCapability {
  verb: string
  protocol: string
  path: string
  description?: string
  spec_url?: string
  spec_format?: string
}

export interface TrustEntry {
  codename: string
  url?: string
  public_key: string
  relationship?: string
}

/**
 * A tool server the agent trusts and knows how to onboard the user to.
 * `manifest_url` is the source of truth for `cryptography.public_key`
 * — that's the key we seal user credentials against. The seal is what
 * the client persists; plaintext never leaves the browser's memory.
 */
export interface TrustedToolServer {
  /** Unique id (matches the tool server's own manifest codename). */
  codename: string
  /** Human name shown in the Add Tool card (e.g. "Salesforce"). */
  display_name: string
  /** One-sentence description of what adding this unlocks. */
  description: string
  /** Where to fetch the tool server's cosmos-logos manifest — we
   *  read `cryptography.public_key` from it at seal time. */
  manifest_url: string
  /** The MCP endpoint Athena dispatches tools/call requests to. */
  mcp_url: string
  /** Icon key (matched against a client-side icon map). */
  icon?: string
  /** Brand color for the card accent. */
  color?: string
  /** Which onboarding ceremony the UI runs. */
  onboarding: 'salesforce-oauth' | 'google-oauth' | 'byok' | 'none'
  /** Copy shown on the wizard's recovery disclaimer (LastPass-style). */
  recovery_copy?: string
}

// Connection modes must stay in lockstep with environment-store's
// AppEnvironment union so autoConnectAthena can stamp the agent with
// `env.current` directly. 'dev' is a legacy alias kept for persisted
// records created before the 'local' preset was introduced.
export type ConnectionMode = 'cloud' | 'dev' | 'offgrid' | 'local' | 'custom'

export interface ConnectedAgent {
  id: string                       // unique instance ID (may differ from codename for multi-instance)
  url: string                      // live endpoint URL (what the user connected to)
  manifest: CosmosLogosManifest
  displayName?: string             // user-provided override (e.g. "Athena AWS", "Athena Off-Grid")
  connectionMode?: ConnectionMode  // which deployment mode was used to connect
  rateTableVersion: string
  connectedAt: string
  capabilities: string[]           // extracted verb list
}

/** Get the display name for a connected agent (user override > manifest name) */
export function agentDisplayName(agent: ConnectedAgent): string {
  return agent.displayName || agent.manifest.identity.name
}

export interface JournalEntry {
  path: string
  title?: string
  synced?: boolean
}

export interface JournalStatus {
  branch: string
  has_remote: boolean
  ahead: number
  behind: number
  is_dirty: boolean
  entry_count: number
}

export interface JournalSettings {
  repo_path: string
  default_branch: string
  auto_sync: boolean
  sync_interval_seconds: number
}

export interface SeaShellBalance {
  user_id: string
  usage_today: number
  limit: number
  remaining: number
  allowed: boolean
}

export interface SearchResult {
  file: string
}
