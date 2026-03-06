import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppEnvironment = 'cloud' | 'offgrid' | 'custom';

const ENVIRONMENT_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://us-west-1-api-int.olympus-grid.ai/v1/athena',
  offgrid: 'https://athena-616.ngrok.io/v1/athena',
  custom: '',
};

const GATEWAY_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://us-west-1-api-int.olympus-grid.ai',
  offgrid: 'https://athena-616.ngrok.io',
  custom: '',
};

// Poseidon MCP endpoint — full URL including path
// Cloud: goes through ALB which routes /v1/poseidon/* directly to container
// Offgrid: goes direct to localhost (Ares/Hermes proxy mangles the path)
const POSEIDON_MCP_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://us-west-1-api-int.olympus-grid.ai/v1/poseidon/mcp/poc/mcp',
  offgrid: 'http://localhost:3431/v1/poseidon/mcp/poc/mcp',
  custom: '',
};

// Hermes base URL — used for OAuth relay endpoints
const HERMES_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://us-west-1-api-int.olympus-grid.ai/v1/hermes',
  offgrid: 'http://localhost:3411/v1/hermes',
  custom: '',
};

// Mnemosyne base URL — used for conversation history
const MNEMOSYNE_URLS: Record<AppEnvironment, string> = {
  cloud: 'https://us-west-1-api-int.olympus-grid.ai/v1/mnemosyne',
  offgrid: 'http://localhost:3711/v1/mnemosyne',
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
  getPoseidonMcpUrl: () => string;
  getHermesUrl: () => string;
  getMnemosyneUrl: () => string;
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

      getPoseidonMcpUrl: () => {
        const state = get();
        if (state.current === 'custom') {
          // Assume custom endpoint is an Athena URL; derive Poseidon from same origin
          try {
            return new URL(state.customEndpoint).origin + '/v1/poseidon/mcp/poc/mcp';
          } catch {
            return state.customEndpoint;
          }
        }
        return POSEIDON_MCP_URLS[state.current];
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
    }),
    { name: 'turtleshell-environment' },
  ),
);
