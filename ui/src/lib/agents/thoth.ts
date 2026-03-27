import type {
  CosmosLogosManifest, JournalEntry, JournalStatus,
  JournalSettings, SeaShellBalance, SearchResult
} from '../cosmos-logos/types'

export class ThothClient {
  public readonly manifest: CosmosLogosManifest
  constructor(
    private baseUrl: string,
    manifest: CosmosLogosManifest,
  ) { this.manifest = manifest }

  // -- Read endpoints (no auth required) --

  async getEntries(): Promise<JournalEntry[]> {
    const res = await fetch(`${this.baseUrl}/journal/entries`)
    if (!res.ok) throw new Error(`Failed to fetch entries: ${res.status}`)
    return res.json()
  }

  async getEntry(path: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/journal/entry/${encodeURIComponent(path)}`)
    if (!res.ok) throw new Error(`Failed to fetch entry: ${res.status}`)
    return res.text()
  }

  async search(q: string): Promise<SearchResult[]> {
    const res = await fetch(`${this.baseUrl}/journal/search?q=${encodeURIComponent(q)}`)
    if (!res.ok) throw new Error(`Search failed: ${res.status}`)
    return res.json()
  }

  async getStatus(): Promise<JournalStatus> {
    const res = await fetch(`${this.baseUrl}/journal/status`)
    if (!res.ok) throw new Error(`Status failed: ${res.status}`)
    return res.json()
  }

  async getSettings(): Promise<JournalSettings> {
    const res = await fetch(`${this.baseUrl}/journal/settings`)
    if (!res.ok) throw new Error(`Settings failed: ${res.status}`)
    return res.json()
  }

  async getBalance(userId?: string): Promise<SeaShellBalance> {
    const params = userId ? `?user_id=${encodeURIComponent(userId)}` : ''
    const res = await fetch(`${this.baseUrl}/entitlement/balance${params}`)
    if (!res.ok) throw new Error(`Balance failed: ${res.status}`)
    return res.json()
  }

  async getHealth(): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/health`)
    if (!res.ok) throw new Error(`Health failed: ${res.status}`)
    return res.json()
  }

  // -- Write endpoints (auth not enforced yet -- send without auth headers) --

  async createEntry(title: string, content: string, tags: string[] = [], mode: string = 'auto_merge'): Promise<{ path: string; mode: string; title: string }> {
    const res = await fetch(`${this.baseUrl}/journal/entry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, tags, mode }),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`Create entry failed: ${res.status} ${err}`)
    }
    return res.json()
  }

  async updateSettings(settings: Partial<JournalSettings>): Promise<JournalSettings> {
    const res = await fetch(`${this.baseUrl}/journal/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`Update settings failed: ${res.status} ${err}`)
    }
    return res.json()
  }

  async sync(): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/journal/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`Sync failed: ${res.status}`)
    return res.json()
  }

  // -- SSE streaming chat --

  async *chat(messages: Array<{ role: string; content: string }>): AsyncGenerator<string, void, unknown> {
    const body = JSON.stringify({ messages })

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.status}`)
    }

    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (parsed.delta) yield parsed.delta
              if (parsed.done || parsed.error) return
            } catch { /* ignore unparseable lines */ }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
