import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppEnvironment = 'cloud' | 'offgrid' | 'custom';

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

  setEnvironment:   (env: AppEnvironment) => void;
  setEndpoint:      (service: keyof ServiceEndpoints, url: string) => void;
  setDeveloperMode: (enabled: boolean) => void;

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

// Auto-detect environment: cloud if hosted on turtleshell.ai, offgrid otherwise
const isCloud = typeof window !== 'undefined' && window.location.hostname.endsWith('turtleshell.ai');
const defaultEnv: AppEnvironment = isCloud ? 'cloud' : 'offgrid';

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      current:       defaultEnv,
      endpoints:     SERVICE_DEFAULTS[defaultEnv],
      developerMode: false,

      setEnvironment: (current) =>
        set({ current, endpoints: SERVICE_DEFAULTS[current] }),

      setEndpoint: (service, url) =>
        set((state) => ({
          current:   'custom',
          endpoints: { ...state.endpoints, [service]: url },
        })),

      setDeveloperMode: (developerMode) => set({ developerMode }),

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
        return persisted;
      },
    },
  ),
);
