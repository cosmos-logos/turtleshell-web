import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConnectedAgent, ConnectionMode, CosmosLogosManifest } from './types'

interface CosmosLogosStore {
  agents: ConnectedAgent[]

  /** ID of the cosmos agent currently active as a chat voice (no app_url agents) */
  activeChatAgentId: string | null
  setActiveChatAgent: (agentId: string | null) => void

  addAgent: (url: string, manifest: CosmosLogosManifest, displayName?: string, connectionMode?: ConnectionMode) => void
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

      addAgent: (url, manifest, displayName, connectionMode) => {
        // Generate unique ID — allow multiple instances of the same agent
        const baseId = manifest.identity.codename
        const existingIds = new Set(get().agents.map(a => a.id))
        let id = baseId
        if (displayName) {
          // User-provided name → slug it as the ID
          id = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || baseId
        }
        // If ID already taken, append a number
        if (existingIds.has(id)) {
          let i = 2
          while (existingIds.has(`${id}-${i}`)) i++
          id = `${id}-${i}`
        }

        const agent: ConnectedAgent = {
          id,
          url: url,
          manifest,
          displayName: displayName || undefined,
          connectionMode: connectionMode || undefined,
          rateTableVersion: '1.0.0',
          connectedAt: new Date().toISOString(),
          capabilities: manifest.capabilities.map(c => c.verb),
        }
        // Re-adding athena clears the manual-disconnect flag
        if (manifest.identity.codename === 'athena-616') {
          localStorage.removeItem('turtleshell-athena-disconnected')
        }
        set(state => ({
          agents: [...state.agents, agent]
        }))
        // Visibility: auto-hide background services (display.visible: false)
        // Auto-SHOW agents that were hidden in the catalog (thoth, homework-buddy, agora, etc.)
        try {
          const raw = localStorage.getItem('turtleshell-hidden-agents')
          const hidden: string[] = raw ? JSON.parse(raw) : []
          if (manifest.display?.visible === false) {
            // Background service — hide
            if (!hidden.includes(agent.id)) {
              hidden.push(agent.id)
              localStorage.setItem('turtleshell-hidden-agents', JSON.stringify(hidden))
            }
          } else {
            // Regular agent — make visible (remove agent ID and codename from hidden if present)
            const toUnhide = new Set([agent.id, manifest.identity.codename])
            const filtered = hidden.filter(h => !toUnhide.has(h))
            if (filtered.length !== hidden.length) {
              localStorage.setItem('turtleshell-hidden-agents', JSON.stringify(filtered))
            }
          }
        } catch {}
      },

      removeAgent: (agentId) => {
        sessionStorage.removeItem(`cosmos-agent-${agentId}-token`)
        // Find the agent's codename before removing
        const agent = get().agents.find(a => a.id === agentId)
        const codename = agent?.manifest.identity.codename
        // Persist disconnect for athena so auto-connect doesn't bring it back on next boot
        if (codename === 'athena-616') {
          localStorage.setItem('turtleshell-athena-disconnected', '1')
        }
        set(state => ({
          agents: state.agents.filter(a => a.id !== agentId),
          activeChatAgentId: state.activeChatAgentId === agentId ? null : state.activeChatAgentId,
        }))
        // Re-hide catalog agents (thoth, homework-buddy, agora) when disconnected
        if (codename && ['thoth', 'homework-buddy', 'agora'].includes(codename)) {
          try {
            const raw = localStorage.getItem('turtleshell-hidden-agents')
            const hidden: string[] = raw ? JSON.parse(raw) : []
            if (!hidden.includes(codename)) {
              hidden.push(codename)
              localStorage.setItem('turtleshell-hidden-agents', JSON.stringify(hidden))
            }
          } catch {}
        }
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
