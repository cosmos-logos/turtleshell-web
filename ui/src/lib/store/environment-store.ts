import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppEnvironment = 'cloud' | 'offgrid' | 'custom';

const ENVIRONMENT_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://us-west-1-api-int.olympus-grid.ai/v1/athena',
  offgrid: 'https://athena-616.ngrok.io',
  custom: '',
};

const GATEWAY_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://us-west-1-api-int.olympus-grid.ai',
  offgrid: 'https://athena-616.ngrok.io',
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
    }),
    { name: 'turtleshell-environment' },
  ),
);
