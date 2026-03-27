import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConnectedAgent, CosmosLogosManifest } from './types'

interface CosmosLogosStore {
  agents: ConnectedAgent[]

  /** ID of the cosmos agent currently active as a chat voice (no app_url agents) */
  activeChatAgentId: string | null
  setActiveChatAgent: (agentId: string | null) => void

  addAgent: (url: string, manifest: CosmosLogosManifest) => void
  removeAgent: (agentId: string) => void
  getAgent: (agentId: string) => ConnectedAgent | undefined

  /** Returns list of capability verbs across all connected agents */
  getUnlockedSurfaces: () => string[]

  /** Store sealed token in sessionStorage (dies on tab close) */
  storeSealedToken: (agentId: string, sealedToken: string) => void
  /** Retrieve sealed token */
  getSealedToken: (agentId: string) => string | null
  /** Check if token needs re-sealing (sessionStorage cleared) */
  needsReconnect: (agentId: string) => boolean
}

export const useCosmosLogosStore = create<CosmosLogosStore>()(
  persist(
    (set, get) => ({
      agents: [],
      activeChatAgentId: null,

      setActiveChatAgent: (agentId) => set({ activeChatAgentId: agentId }),

      addAgent: (url, manifest) => {
        const agent: ConnectedAgent = {
          id: manifest.identity.codename,
          url: url,
          manifest,
          rateTableVersion: '1.0.0',
          connectedAt: new Date().toISOString(),
          capabilities: manifest.capabilities.map(c => c.verb),
        }
        set(state => ({
          agents: [...state.agents.filter(a => a.id !== agent.id), agent]
        }))
        // If manifest declares visible: false, auto-hide on first connect
        if (manifest.display?.visible === false) {
          try {
            const raw = localStorage.getItem('turtleshell-hidden-agents')
            const hidden: string[] = raw ? JSON.parse(raw) : []
            if (!hidden.includes(agent.id)) {
              hidden.push(agent.id)
              localStorage.setItem('turtleshell-hidden-agents', JSON.stringify(hidden))
            }
          } catch {}
        }
      },

      removeAgent: (agentId) => {
        sessionStorage.removeItem(`cosmos-agent-${agentId}-token`)
        set(state => ({
          agents: state.agents.filter(a => a.id !== agentId),
          activeChatAgentId: state.activeChatAgentId === agentId ? null : state.activeChatAgentId,
        }))
      },

      getAgent: (agentId) => {
        return get().agents.find(a => a.id === agentId)
      },

      getUnlockedSurfaces: () => {
        const verbs = new Set<string>()
        for (const agent of get().agents) {
          for (const cap of agent.capabilities) {
            verbs.add(cap)
          }
        }
        return Array.from(verbs)
      },

      storeSealedToken: (agentId, sealedToken) => {
        sessionStorage.setItem(`cosmos-agent-${agentId}-token`, sealedToken)
      },

      getSealedToken: (agentId) => {
        return sessionStorage.getItem(`cosmos-agent-${agentId}-token`)
      },

      needsReconnect: (agentId) => {
        const agent = get().agents.find(a => a.id === agentId)
        if (!agent) return false
        return !sessionStorage.getItem(`cosmos-agent-${agentId}-token`)
      },
    }),
    {
      name: 'turtleshell-cosmos-agents',
      partialize: (state) => ({
        agents: state.agents,
      }),
    }
  )
)
