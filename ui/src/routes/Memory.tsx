import { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Trash2,
  Loader2,
  Search,
  Filter,
  Eye,
  EyeOff,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { useActiveAgentScope } from '@/lib/agent-scope';

type MemoryScope = 'tenant' | 'shell' | 'agent' | 'agent-tenant' | 'agent-shell';
type MemoryCategory = 'identity' | 'preference' | 'project' | 'relationship' | 'knowledge' | 'system';

interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  tenantId: string | null;
  shellId: string | null;
  agentId: string | null;
  key: string;
  value: string;
  category: MemoryCategory;
  confidence: number;
  tags: string[];
  source: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const SCOPE_COLORS: Record<MemoryScope, string> = {
  'tenant':       'bg-purple-500/20 text-purple-400',
  'shell':        'bg-blue-500/20 text-blue-400',
  'agent':        'bg-orange-500/20 text-orange-400',
  'agent-tenant': 'bg-yellow-500/20 text-yellow-400',
  'agent-shell':  'bg-green-500/20 text-green-400',
};

const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  'identity':     'bg-pink-500/20 text-pink-400',
  'preference':   'bg-indigo-500/20 text-indigo-400',
  'project':      'bg-cyan-500/20 text-cyan-400',
  'relationship': 'bg-rose-500/20 text-rose-400',
  'knowledge':    'bg-emerald-500/20 text-emerald-400',
  'system':       'bg-gray-500/20 text-gray-400',
};

const ALL_SCOPES: MemoryScope[] = ['tenant', 'shell', 'agent', 'agent-tenant', 'agent-shell'];
const ALL_CATEGORIES: MemoryCategory[] = ['identity', 'preference', 'project', 'relationship', 'knowledge', 'system'];

export function Memory() {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState<MemoryScope | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [forgetting, setForgetting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const scope = useActiveAgentScope();

  // Same JWT-from-localStorage pattern as olympus-grid-client.ts. Used by every
  // mutating call so cross-origin requests carry identity without relying on cookies.
  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    const ogToken = localStorage.getItem('og_access_token');
    if (ogToken) h['x-user-identity'] = ogToken;
    return h;
  }

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      const mnUrl = useEnvironmentStore.getState().getMnemosyneUrl();
      // Same localStorage + x-user-identity header pattern as olympus-grid-client.ts.
      // Cookies don't reliably traverse cross-origin (turtleshell.ai → api-int.turtleshell.ai
      // in prod, localhost:5173 → athena-616.ngrok.io in dev) so the JWT travels
      // explicitly in the header. The token was captured during verifyCode().
      const headers: Record<string, string> = {};
      const ogToken = localStorage.getItem('og_access_token');
      if (ogToken) headers['x-user-identity'] = ogToken;
      // Scope server-side; client-side filter below is defense-in-depth.
      const qs = scope.toQueryParams().toString();
      const res = await fetch(`${mnUrl}/api/memory/reflect${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
        headers,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (err: any) {
      console.warn('[Memory] Failed to fetch:', err.message);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, [showInactive, scope]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const forgetMemory = async (id: string) => {
    if (!confirm('Delete this memory? This cannot be undone.')) return;
    setForgetting(id);
    try {
      const mnUrl = useEnvironmentStore.getState().getMnemosyneUrl();
      const res = await fetch(`${mnUrl}/api/memory/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders(),
      });
      if (res.ok) {
        // Optimistic remove instead of refetch — agent will see fresh state on
        // its next recall (no cache anywhere).
        setMemories((prev) => prev.filter((m) => m.id !== id));
      } else {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.warn('[Memory] Failed to forget:', err.message);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setForgetting(null);
    }
  };

  const startEdit = (m: MemoryRecord) => {
    setEditingId(m.id);
    setEditValue(m.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (m: MemoryRecord) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === m.value) {
      cancelEdit();
      return;
    }
    setSavingId(m.id);
    try {
      const mnUrl = useEnvironmentStore.getState().getMnemosyneUrl();
      // POST with the same key+identity upserts on the deterministic MemoryId__c
      // hash, so the existing row's Content__c just gets updated in place.
      const res = await fetch(`${mnUrl}/api/memory`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          key: m.key,
          value: trimmed,
          agentId: m.agentId || 'athena',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      // Optimistic in-place update — the next chat turn's recall will see the
      // new value because Athena queries Salesforce on every turn (no cache).
      setMemories((prev) =>
        prev.map((row) => (row.id === m.id ? { ...row, value: trimmed, updatedAt: new Date().toISOString() } : row))
      );
      cancelEdit();
    } catch (err: any) {
      console.warn('[Memory] Failed to save edit:', err.message);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  // Client-side safety filter — only memories stamped with an agentId that
  // belongs to the active scope. Server should already filter, but we hedge.
  const scopedMemories = memories.filter((m) => scope.matches(m.agentId));

  // Filter memories
  const filtered = scopedMemories.filter(m => {
    if (scopeFilter !== 'all' && m.scope !== scopeFilter) return false;
    if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const haystack = `${m.key} ${m.value} ${(m.tags || []).join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header — memories are scoped to the active agent (the top-of-screen
            picker). Each agent forms its own relationship with you. */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg border flex-shrink-0"
            style={{ backgroundColor: `${scope.color}25`, color: scope.color, borderColor: `${scope.color}40` }}
          >
            {scope.avatar}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Memory with {scope.displayName}</h1>
            <p className="text-sm text-text-muted">What {scope.displayName} remembers about you.</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-surface-1 rounded-xl border border-border-muted">
          {/* Scope filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-text-muted" />
            <select
              value={scopeFilter}
              onChange={e => setScopeFilter(e.target.value as any)}
              className="bg-surface-2 border border-border-muted rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-shell-400"
            >
              <option value="all">All Scopes</option>
              {ALL_SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as any)}
            className="bg-surface-2 border border-border-muted rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-shell-400"
          >
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface-2 border border-border-muted rounded-lg pl-9 pr-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-shell-400"
            />
          </div>

          {/* Show inactive toggle */}
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              showInactive
                ? 'bg-surface-3 border-shell-400 text-shell-400'
                : 'bg-surface-2 border-border-muted text-text-muted hover:text-text-primary'
            }`}
          >
            {showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
            {showInactive ? 'Showing inactive' : 'Active only'}
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-text-muted">
          <span>{filtered.length} memor{filtered.length === 1 ? 'y' : 'ies'}</span>
          {filtered.length !== scopedMemories.length && (
            <span>({scopedMemories.length} total with {scope.displayName})</span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-shell-400" />
          </div>
        )}

        {/* Empty state — invitational when nothing exists yet; utilitarian
            when filters exclude everything. */}
        {!loading && filtered.length === 0 && (
          scopedMemories.length === 0 ? (
            <div
              className="text-center py-12 px-6 rounded-xl border max-w-xl mx-auto"
              style={{ backgroundColor: `${scope.color}0F`, borderColor: `${scope.color}33` }}
            >
              <div className="text-4xl mb-3">{scope.avatar}</div>
              <p className="text-text-primary font-medium mb-2">
                {scope.displayName} hasn't formed any memories with you yet.
              </p>
              <p className="text-sm text-text-muted italic leading-relaxed max-w-md mx-auto">
                "{scope.greeting}"
              </p>
              <p className="text-xs text-text-muted mt-4">
                Every conversation writes to this memory — privately, scoped to this relationship.
              </p>
            </div>
          ) : (
            <div className="text-center py-16">
              <Brain size={48} className="mx-auto mb-4 text-text-muted opacity-40" />
              <p className="text-text-muted">No memories match your filters.</p>
            </div>
          )
        )}

        {/* Memory table */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map(m => (
              <div
                key={m.id}
                className={`p-4 rounded-xl border transition-colors ${
                  m.active
                    ? 'bg-surface-1 border-border-muted hover:border-border'
                    : 'bg-surface-1/50 border-border-muted/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-medium ${SCOPE_COLORS[m.scope]}`}>
                        {m.scope}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-medium ${CATEGORY_COLORS[m.category]}`}>
                        {m.category}
                      </span>
                      <span className="text-2xs text-text-muted">
                        {Math.round(m.confidence * 100)}%
                      </span>
                      {!m.active && (
                        <span className="px-2 py-0.5 rounded-full text-2xs font-medium bg-red-500/20 text-red-400">
                          forgotten
                        </span>
                      )}
                    </div>

                    {/* Key + Value */}
                    <div className="mb-1">
                      <span className="font-medium text-sm text-text-primary">{m.key}</span>
                    </div>
                    {editingId === m.id ? (
                      <div className="flex items-start gap-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          rows={Math.min(5, Math.max(1, editValue.split('\n').length))}
                          className="flex-1 bg-surface-2 border border-shell-400 rounded-lg px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-shell-400 resize-y"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit(m);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <button
                          onClick={() => saveEdit(m)}
                          disabled={savingId === m.id}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors flex-shrink-0"
                          title="Save (⌘+Enter)"
                        >
                          {savingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={savingId === m.id}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                          title="Cancel (Esc)"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary break-words">{m.value}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-2xs text-text-muted">
                      {m.agentId && <span>agent: {m.agentId}</span>}
                      {m.shellId && <span>shell: {m.shellId}</span>}
                      {m.tenantId && <span>tenant: {m.tenantId}</span>}
                      {m.source && <span>source: {m.source.substring(0, 8)}...</span>}
                      <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Tags */}
                    {m.tags && m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.tags.map((tag, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-2xs bg-surface-3 text-text-muted">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Edit + Forget buttons */}
                  {m.active && editingId !== m.id && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(m)}
                        className="p-2 rounded-lg text-text-muted hover:text-shell-400 hover:bg-shell-500/10 transition-colors"
                        title="Edit this memory"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => forgetMemory(m.id)}
                        disabled={forgetting === m.id}
                        className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Forget this memory"
                      >
                        {forgetting === m.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
