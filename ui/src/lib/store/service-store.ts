import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RegisteredService,
  ServiceCategory,
  OlympusUser,
} from '@/types/service';
import { clearStoredTokens } from '@/lib/api/olympus-grid-client';
import { useAgentStore } from '@/lib/store/agent-store';
import { disconnectSalesforce as disconnectSfTokens } from '@/lib/api/salesforce-client';
import { disconnectGitHub as disconnectGhTokens } from '@/lib/api/github-client';
import { disconnectGoogle as disconnectGoogleTokens } from '@/lib/api/google-client';
import { disconnectHubSpot as disconnectHsTokens } from '@/lib/api/hubspot-client';
import { disconnectWorkday as disconnectWdTokens } from '@/lib/api/workday-client';

interface ServiceStore {
  services: Record<string, RegisteredService>;
  activeServiceIds: Partial<Record<ServiceCategory, string>>;
  olympusGridUser: OlympusUser | null;

  register: (service: RegisteredService) => void;
  remove: (id: string) => void;
  setActive: (category: ServiceCategory, id: string) => void;
  activeService: (category: ServiceCategory) => RegisteredService | null;
  servicesByCategory: (category: ServiceCategory) => RegisteredService[];
  setOlympusGridConnected: (user: OlympusUser) => void;
  disconnectOlympusGrid: () => void;
  isOlympusGridConnected: () => boolean;
  setSalesforceConnected: (instanceUrl: string) => void;
  disconnectSalesforce: () => void;
  isSalesforceConnected: () => boolean;
  setGitHubConnected: (login: string) => void;
  disconnectGitHub: () => void;
  isGitHubConnected: () => boolean;
  setGoogleConnected: (email: string) => void;
  disconnectGoogle: () => void;
  isGoogleConnected: () => boolean;
  setHubSpotConnected: (portalId: string) => void;
  disconnectHubSpot: () => void;
  isHubSpotConnected: () => boolean;
  setWorkdayConnected: (endpoint: string, tenant: string) => void;
  disconnectWorkday: () => void;
  isWorkdayConnected: () => boolean;
}

export const useServiceStore = create<ServiceStore>()(
  persist(
    (set, get) => ({
      services: {},
      activeServiceIds: {},
      olympusGridUser: null,

      register: (service) =>
        set((state) => ({
          services: { ...state.services, [service.id]: service },
          activeServiceIds: {
            ...state.activeServiceIds,
            [service.category]: service.id,
          },
        })),

      remove: (id) =>
        set((state) => {
          const { [id]: _, ...remaining } = state.services;
          const activeServiceIds = { ...state.activeServiceIds };
          // Remove from active if this was the active service
          for (const [cat, activeId] of Object.entries(activeServiceIds)) {
            if (activeId === id) {
              delete activeServiceIds[cat as ServiceCategory];
            }
          }
          return { services: remaining, activeServiceIds };
        }),

      setActive: (category, id) =>
        set((state) => ({
          activeServiceIds: { ...state.activeServiceIds, [category]: id },
        })),

      activeService: (category) => {
        const state = get();
        const id = state.activeServiceIds[category];
        return id ? state.services[id] ?? null : null;
      },

      servicesByCategory: (category) => {
        const state = get();
        return Object.values(state.services).filter(
          (s) => s.category === category,
        );
      },

      setOlympusGridConnected: (user) =>
        set((state) => {
          const service: RegisteredService = {
            id: 'olympus-grid',
            displayName: 'Olympus-Grid',
            category: 'platform',
            provider: 'olympus-grid',
            connectedAt: Date.now(),
            isConnected: true,
          };
          return {
            olympusGridUser: user,
            services: { ...state.services, [service.id]: service },
            activeServiceIds: { ...state.activeServiceIds, platform: service.id },
          };
        }),

      disconnectOlympusGrid: () => {
        clearStoredTokens();
        useAgentStore.getState().refreshAuth();
        return set((state) => {
          const { 'olympus-grid': _, ...remaining } = state.services;
          const { platform: __, ...activeIds } = state.activeServiceIds;
          return {
            olympusGridUser: null,
            services: remaining,
            activeServiceIds: activeIds,
          };
        });
      },

      isOlympusGridConnected: () => get().olympusGridUser !== null,

      setSalesforceConnected: (instanceUrl) =>
        set((state) => {
          const service: RegisteredService = {
            id: 'salesforce',
            displayName: 'Salesforce',
            category: 'crm',
            provider: 'salesforce',
            connectedAt: Date.now(),
            isConnected: true,
            environment: instanceUrl.includes('test.salesforce.com') || instanceUrl.includes('.scratch.')
              ? 'sandbox'
              : 'production',
          };
          return {
            services: { ...state.services, [service.id]: service },
            activeServiceIds: { ...state.activeServiceIds, crm: service.id },
          };
        }),

      disconnectSalesforce: () => {
        disconnectSfTokens();
        return set((state) => {
          const { salesforce: _, ...remaining } = state.services;
          const { crm: __, ...activeIds } = state.activeServiceIds;
          return {
            services: remaining,
            activeServiceIds: activeIds,
          };
        });
      },

      isSalesforceConnected: () => !!get().services['salesforce'],

      setGitHubConnected: (_login) =>
        set((state) => {
          const service: RegisteredService = {
            id: 'github',
            displayName: 'GitHub',
            category: 'sourceControl',
            provider: 'github',
            connectedAt: Date.now(),
            isConnected: true,
          };
          return {
            services: { ...state.services, [service.id]: service },
            activeServiceIds: { ...state.activeServiceIds, sourceControl: service.id },
          };
        }),

      disconnectGitHub: () => {
        disconnectGhTokens();
        return set((state) => {
          const { github: _, ...remaining } = state.services;
          const { sourceControl: __, ...activeIds } = state.activeServiceIds;
          return {
            services: remaining,
            activeServiceIds: activeIds,
          };
        });
      },

      isGitHubConnected: () => !!get().services['github'],

      setGoogleConnected: (_email) =>
        set((state) => {
          const service: RegisteredService = {
            id: 'google',
            displayName: 'Google',
            category: 'calendar',
            provider: 'google',
            connectedAt: Date.now(),
            isConnected: true,
          };
          return {
            services: { ...state.services, [service.id]: service },
            activeServiceIds: { ...state.activeServiceIds, calendar: service.id },
          };
        }),

      disconnectGoogle: () => {
        disconnectGoogleTokens();
        return set((state) => {
          const { google: _, ...remaining } = state.services;
          const { calendar: __, ...activeIds } = state.activeServiceIds;
          return {
            services: remaining,
            activeServiceIds: activeIds,
          };
        });
      },

      isGoogleConnected: () => !!get().services['google'],

      setHubSpotConnected: (_portalId) =>
        set((state) => {
          const service: RegisteredService = {
            id: 'hubspot',
            displayName: 'HubSpot',
            category: 'crm',
            provider: 'hubspot',
            connectedAt: Date.now(),
            isConnected: true,
          };
          return {
            services: { ...state.services, [service.id]: service },
            activeServiceIds: { ...state.activeServiceIds, crm: service.id },
          };
        }),

      disconnectHubSpot: () => {
        disconnectHsTokens();
        return set((state) => {
          const { hubspot: _, ...remaining } = state.services;
          // Only clear crm active if hubspot was the active CRM
          const activeIds = { ...state.activeServiceIds };
          if (activeIds.crm === 'hubspot') {
            delete activeIds.crm;
          }
          return {
            services: remaining,
            activeServiceIds: activeIds,
          };
        });
      },

      isHubSpotConnected: () => !!get().services['hubspot'],

      setWorkdayConnected: (_endpoint, _tenant) =>
        set((state) => {
          const service: RegisteredService = {
            id: 'workday',
            displayName: 'Workday',
            category: 'identity',
            provider: 'workday',
            connectedAt: Date.now(),
            isConnected: true,
          };
          return {
            services: { ...state.services, [service.id]: service },
            activeServiceIds: { ...state.activeServiceIds, identity: service.id },
          };
        }),

      disconnectWorkday: () => {
        disconnectWdTokens();
        return set((state) => {
          const { workday: _, ...remaining } = state.services;
          const { identity: __, ...activeIds } = state.activeServiceIds;
          return {
            services: remaining,
            activeServiceIds: activeIds,
          };
        });
      },

      isWorkdayConnected: () => !!get().services['workday'],
    }),
    {
      name: 'turtleshell-services',
      // Only persist non-sensitive metadata — credentials go through secure session
      partialize: (state) => ({
        services: Object.fromEntries(
          Object.entries(state.services).map(([id, s]) => [
            id,
            { ...s, credentials: undefined },
          ]),
        ),
        activeServiceIds: state.activeServiceIds,
        olympusGridUser: state.olympusGridUser,
      }),
    },
  ),
);
