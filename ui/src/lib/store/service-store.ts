import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RegisteredService,
  ServiceCategory,
} from '@/types/service';

interface ServiceStore {
  services: Record<string, RegisteredService>;
  activeServiceIds: Partial<Record<ServiceCategory, string>>;

  register: (service: RegisteredService) => void;
  remove: (id: string) => void;
  setActive: (category: ServiceCategory, id: string) => void;
  activeService: (category: ServiceCategory) => RegisteredService | null;
  servicesByCategory: (category: ServiceCategory) => RegisteredService[];
}

export const useServiceStore = create<ServiceStore>()(
  persist(
    (set, get) => ({
      services: {},
      activeServiceIds: {},

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
      }),
    },
  ),
);
