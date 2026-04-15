import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

      getAthenaUrl:    () => get().endpoints.athena,
      getHermesUrl:    () => get().endpoints.hermes,
      getMnemosyneUrl: () => get().endpoints.mnemosyne,
      getPlutusUrl:    () => get().endpoints.plutus,
      getApolloUrl:    () => get().endpoints.apollo,
      getAresUrl:      () => get().endpoints.ares,

      // Legacy compat — was getBaseUrl (pointed at athena)
      getBaseUrl: () => get().endpoints.athena,
      getGatewayUrl: () => {
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
