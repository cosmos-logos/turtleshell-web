import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// EOS-2 cluster override — ClusterContext writes the active cluster's
// gateway URL here on every CLUSTERS/SELECT or CLUSTERS/USE_OVERRIDE.
// Kept in sync with the constant in src/state/cluster.ts.
const CLUSTER_OVERRIDE_KEY = 'og_api_base';

/** Read the active cluster's gateway URL (origin only, no trailing slash).
 *  Returns null when no cluster is selected — caller falls back to the
 *  env-store preset. */
function readClusterOverride(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CLUSTER_OVERRIDE_KEY);
    if (!raw) return null;
    const trimmed = raw.trim().replace(/\/+$/, '');
    return trimmed || null;
  } catch {
    return null;
  }
}

/** When a cluster override is active, build `${cluster}/v1/${service}`;
 *  otherwise return the preset URL unchanged. */
function withClusterOverride(preset: string, servicePath: string): string {
  const override = readClusterOverride();
  if (!override) return preset;
  return `${override}/v1/${servicePath}`;
}

/**
 * Apply the active cluster override to an arbitrary base URL, swapping
 * the origin while preserving the path. Used by clients that resolve
 * their URL from somewhere other than the env-store getters (notably
 * `chat-client.ts`, which picks up the URL from the connected cosmos-
 * logos agent — that agent.url is persisted in zustand and pre-dates
 * the cluster pick).
 *
 * Idempotent: if `originalUrl` already starts with the cluster origin,
 * the result is unchanged. Falls back to `originalUrl` on parse errors
 * and when no cluster is selected.
 */
export function applyClusterOverride(originalUrl: string): string {
  if (!originalUrl) return originalUrl;
  const override = readClusterOverride();
  if (!override) return originalUrl;
  try {
    const parsed = new URL(originalUrl);
    // Preserve the path so /v1/athena, /v1/apollo, etc. survive the swap.
    const path = parsed.pathname.replace(/\/+$/, '');
    return `${override}${path}`;
  } catch {
    // Relative URLs (e.g. '/v1/athena') — env-store offgrid/local presets.
    // Treat the override as the new origin and graft the path on.
    const path = originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`;
    return `${override}${path.replace(/\/+$/, '')}`;
  }
}

export type AppEnvironment = 'cloud' | 'offgrid' | 'local' | 'custom';

/** Default URLs for each service per environment preset. */
const SERVICE_DEFAULTS: Record<AppEnvironment, ServiceEndpoints> = {
  cloud: {
    athena:    'https://api-int.turtleshell.ai/v1/athena',
    hermes:    'https://api-int.turtleshell.ai/v1/hermes',
    mnemosyne: 'https://api-int.turtleshell.ai/v1/mnemosyne',
    plutus:    'https://api-int.turtleshell.ai/v1/plutus/api',
    apollo:    'https://api-int.turtleshell.ai/v1/apollo',
    ares:      'https://api-int.turtleshell.ai/v1/ares',
  },
  offgrid: {
    athena:    '/v1/athena',
    hermes:    '/v1/hermes',
    mnemosyne: '/v1/mnemosyne',
    plutus:    '/v1/plutus/api',
    apollo:    '/v1/apollo',
    ares:      '/v1/ares',
  },
  // Dev-laptop preset — fleet running directly on the developer's machine.
  // Uses relative paths so the Vite dev server proxies /v1/* → local Ares
  // (:3451) → the appropriate god port. This matches vite.config.ts.
  // Same shape as 'offgrid' but kept as a distinct preset so the UI can
  // show "Local Dev" without conflating with the off-grid appliance path.
  local: {
    athena:    '/v1/athena',
    hermes:    '/v1/hermes',
    mnemosyne: '/v1/mnemosyne',
    plutus:    '/v1/plutus/api',
    apollo:    '/v1/apollo',
    ares:      '/v1/ares',
  },
  custom: {
    athena:    '',
    hermes:    '',
    mnemosyne: '',
    plutus:    '',
    apollo:    '',
    ares:      '',
  },
};

export interface ServiceEndpoints {
  athena:    string
  hermes:    string
  mnemosyne: string
  plutus:    string
  apollo:    string
  ares:      string
}

export const SERVICE_LABELS: Record<keyof ServiceEndpoints, { label: string; description: string }> = {
  athena:    { label: 'Athena',    description: 'LLM chat router' },
  hermes:    { label: 'Hermes',    description: 'Message transport & SMS relay' },
  mnemosyne: { label: 'Mnemosyne', description: 'Conversation memory & history' },
  plutus:    { label: 'Plutus',    description: 'Billing, metering & SeaShells' },
  apollo:    { label: 'Apollo',    description: 'Text-to-speech (TTS)' },
  ares:      { label: 'Ares',      description: 'API gateway' },
};

interface EnvironmentStore {
  current: AppEnvironment;
  endpoints: ServiceEndpoints;
  developerMode: boolean;
  /**
   * Test Beta Features — when FALSE (default, what real signups see) we hide
   * almost all system complexity: extra agents, cosmos-logos connections,
   * Services / Service Desk nav, theme selector, BYOK guides in onboarding.
   * When TRUE, the full UI is visible. This is the end-user simplicity knob —
   * kept separate from `developerMode` (which exposes engineer-facing plumbing
   * like env selectors and custom endpoints).
   */
  testBetaEnabled: boolean;

  setEnvironment:   (env: AppEnvironment) => void;
  setEndpoint:      (service: keyof ServiceEndpoints, url: string) => void;
  setDeveloperMode: (enabled: boolean) => void;
  setTestBetaEnabled: (enabled: boolean) => void;

  // Getters for individual services
  getAthenaUrl:    () => string;
  getHermesUrl:    () => string;
  getMnemosyneUrl: () => string;
  getPlutusUrl:    () => string;
  getApolloUrl:    () => string;
  getAresUrl:      () => string;

  // Legacy compat
  getBaseUrl:    () => string;
  getGatewayUrl: () => string;
}

// Auto-detect environment:
//   turtleshell.ai → cloud (production)
//   localhost / 127.* → local (dev fleet running on this machine, Vite proxy
//     forwards /v1/* to local Ares). Using 'offgrid' as the default here
//     conflated "running on the dev laptop" with "running on the off-grid
//     appliance" and made every dev assume the system was broken.
//   anything else → offgrid (same-origin reverse-proxy on an appliance)
const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isCloud = host.endsWith('turtleshell.ai');
const isLocal = host === 'localhost' || host.startsWith('127.') || host === '0.0.0.0';
const defaultEnv: AppEnvironment = isCloud ? 'cloud' : isLocal ? 'local' : 'offgrid';

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      current:         defaultEnv,
      endpoints:       SERVICE_DEFAULTS[defaultEnv],
      developerMode:   false,
      testBetaEnabled: false,

      setEnvironment: (current) =>
        set({ current, endpoints: SERVICE_DEFAULTS[current] }),

      setEndpoint: (service, url) =>
        set((state) => ({
          current:   'custom',
          endpoints: { ...state.endpoints, [service]: url },
        })),

      setDeveloperMode:   (developerMode)   => set({ developerMode }),
      setTestBetaEnabled: (testBetaEnabled) => set({ testBetaEnabled }),

      // Each service-URL getter checks the cluster override FIRST. When the
      // user has picked a Cluster via ClusterPicker (or set a custom URL
      // via NodePicker pre-login), ClusterContext writes the cluster's
      // gateway URL to localStorage.og_api_base. We read it here on every
      // call so every existing API client (chat-client, olympus-grid-
      // client, feedback-client, etc.) retargets automatically — no
      // per-client edits, no React-context dependency from non-React code.
      getAthenaUrl:    () => withClusterOverride(get().endpoints.athena, 'athena'),
      getHermesUrl:    () => withClusterOverride(get().endpoints.hermes, 'hermes'),
      getMnemosyneUrl: () => withClusterOverride(get().endpoints.mnemosyne, 'mnemosyne'),
      getPlutusUrl:    () => withClusterOverride(get().endpoints.plutus,    'plutus/api'),
      getApolloUrl:    () => withClusterOverride(get().endpoints.apollo,    'apollo'),
      getAresUrl:      () => withClusterOverride(get().endpoints.ares,      'ares'),

      // Legacy compat — was getBaseUrl (pointed at athena)
      getBaseUrl: () => withClusterOverride(get().endpoints.athena, 'athena'),
      getGatewayUrl: () => {
        // When a cluster override is active, its endpointUrl IS the gateway
        // origin — no need to URL-parse a relative path. Otherwise fall back
        // to the preset's athena origin.
        const override = readClusterOverride();
        if (override) return override;
        try { return new URL(get().endpoints.athena).origin; } catch { return ''; }
      },
    }),
    {
      name: 'turtleshell-environment',
      version: 1,
      migrate: (persisted: any, version: number) => {
        // v0 → v1: fix users stuck on 'offgrid' while running on turtleshell.ai
        if (version === 0 && isCloud && persisted?.current === 'offgrid') {
          return { ...persisted, current: 'cloud', endpoints: SERVICE_DEFAULTS['cloud'] };
        }
        // v1 → v2: dev laptops stuck on 'offgrid' should move to 'local' so
        // the intent of the preset matches "fleet on this machine" rather
        // than "fleet on an appliance behind a reverse proxy".
        if (isLocal && persisted?.current === 'offgrid') {
          return { ...persisted, current: 'local', endpoints: SERVICE_DEFAULTS['local'] };
        }
        return persisted;
      },
    },
  ),
);
