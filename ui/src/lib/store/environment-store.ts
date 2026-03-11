import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppEnvironment = 'cloud' | 'offgrid' | 'custom';

const ENVIRONMENT_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://api-int.turtleshell.ai/v1/athena',
  offgrid: 'https://athena-616.ngrok.io/v1/athena',
  custom: '',
};

const GATEWAY_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://api-int.turtleshell.ai',
  offgrid: 'https://athena-616.ngrok.io',
  custom: '',
};

// Hermes base URL — used for OAuth relay endpoints
const HERMES_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://api-int.turtleshell.ai/v1/hermes',
  offgrid: 'http://localhost:3411/v1/hermes',
  custom: '',
};

// Mnemosyne base URL — used for conversation history
const MNEMOSYNE_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://api-int.turtleshell.ai/v1/mnemosyne',
  offgrid: 'http://localhost:3711/v1/mnemosyne',
  custom: '',
};

// Plutus base URL — used for billing, metering, and Stripe checkout
const PLUTUS_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://api-int.turtleshell.ai/v1/plutus/api',
  offgrid: 'https://athena-616.ngrok.io/v1/plutus/api',
  custom: '',
};

interface EnvironmentStore {
  current: AppEnvironment;
  customEndpoint: string;
  developerMode: boolean;

  setEnvironment: (env: AppEnvironment) => void;
  setCustomEndpoint: (url: string) => void;
  setDeveloperMode: (enabled: boolean) => void;
  getBaseUrl: () => string;
  getGatewayUrl: () => string;
  getAresUrl: () => string;
  getHermesUrl: () => string;
  getMnemosyneUrl: () => string;
  getPlutusUrl: () => string;
}

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      current: 'offgrid',
      customEndpoint: '',
      developerMode: false,

      setEnvironment: (current) => set({ current }),
      setCustomEndpoint: (customEndpoint) => set({ customEndpoint }),
      setDeveloperMode: (developerMode) => set({ developerMode }),

      getBaseUrl: () => {
        const state = get();
        if (state.current === 'custom') {
          return state.customEndpoint;
        }
        return ENVIRONMENT_URLS[state.current];
      },

      getGatewayUrl: () => {
        const state = get();
        if (state.current === 'custom') {
          try {
            return new URL(state.customEndpoint).origin;
          } catch {
            return state.customEndpoint;
          }
        }
        return GATEWAY_URLS[state.current];
      },

      getAresUrl: () => {
        const state = get();
        if (state.current === 'custom') {
          try {
            return new URL(state.customEndpoint).origin + '/v1/ares';
          } catch {
            return state.customEndpoint;
          }
        }
        return GATEWAY_URLS[state.current] + '/v1/ares';
      },

      getHermesUrl: () => {
        const state = get();
        if (state.current === 'custom') {
          try {
            return new URL(state.customEndpoint).origin + '/v1/hermes';
          } catch {
            return state.customEndpoint;
          }
        }
        return HERMES_URLS[state.current];
      },

      getMnemosyneUrl: () => {
        const state = get();
        if (state.current === 'custom') {
          try {
            return new URL(state.customEndpoint).origin + '/v1/mnemosyne';
          } catch {
            return state.customEndpoint;
          }
        }
        return MNEMOSYNE_URLS[state.current];
      },

      getPlutusUrl: () => {
        const state = get();
        if (state.current === 'custom') {
          try {
            return new URL(state.customEndpoint).origin + '/v1/plutus/api';
          } catch {
            return state.customEndpoint;
          }
        }
        return PLUTUS_URLS[state.current];
      },
    }),
    { name: 'turtleshell-environment' },
  ),
);
