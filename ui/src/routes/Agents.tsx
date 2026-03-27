import { useState } from 'react';
import { Search, Plus, Sparkles, Eye, EyeOff, Pencil, Download, Trash2, ChevronDown, Shield, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useAgentStore, AGENT_CATALOG } from '@/lib/store/agent-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { AddAgentPanel } from '@/components/agents/AddAgentPanel';
import { CreateAgentModal } from '@/components/agents/CreateAgentModal';
import { sealToken, signRequest, loadOrGenerateKeypair } from '@/lib/cosmos-logos/crypto';
import type { Agent } from '@/types/agent';
import type { ConnectedAgent } from '@/lib/cosmos-logos/types';

// Unified agent entry — wraps both built-in and cosmos agents
interface UnifiedAgent {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  type: 'builtin' | 'cosmos' | 'custom';
  builtinAgent?: Agent;
  cosmosAgent?: ConnectedAgent;
  visible: boolean;
}

function useUnifiedAgents(): UnifiedAgent[] {
  const builtinAgents = useAgentStore((s) => s.agents);
  const cosmosAgents = useCosmosLogosStore((s) => s.agents);
  const hiddenIds = useAgentStore((s) => s.hiddenAgentIds);
  const catalogIds = new Set(AGENT_CATALOG.map(a => a.id));

  // Order: Cosmos first, Logos second, then other catalog, then custom
  const order = ['cosmos', 'logos', 'claude', 'openai', 'grok', 'gemini'];

  const builtinItems: UnifiedAgent[] = builtinAgents.map(a => ({
    id: a.id,
    name: a.name,
    icon: a.icon,
    description: a.description,
    color: '#6366f1',
    type: catalogIds.has(a.id) ? 'builtin' as const : 'custom' as const,
    builtinAgent: a,
    visible: !hiddenIds.has(a.id),
  }));

  // Sort built-in by defined order
  builtinItems.sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    const oa = ai >= 0 ? ai : 100;
    const ob = bi >= 0 ? bi : 100;
    return oa - ob;
  });

  const cosmosItems: UnifiedAgent[] = cosmosAgents.map(a => ({
    id: a.id,
    name: a.manifest.identity.name,
    icon: a.manifest.identity.name.charAt(0),
    description: a.manifest.identity.purpose || a.manifest.identity.description || '',
    color: a.manifest.display?.color || '#6366f1',
    type: 'cosmos' as const,
    cosmosAgent: a,
    visible: !hiddenIds.has(a.id),
  }));

  return [...builtinItems, ...cosmosItems];
}

function AgentRow({ agent, onExpand, expanded }: { agent: UnifiedAgent; onExpand: () => void; expanded: boolean }) {
  const toggleVisibility = useAgentStore((s) => s.toggleVisibility);
  const removeCosmosAgent = useCosmosLogosStore((s) => s.removeAgent);
  const developerMode = useEnvironmentStore((s) => s.developerMode);

  // Security test state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'pass' | 'fail'>('idle');

  async function runSecurityTest() {
    if (!agent.cosmosAgent) return;
    setTesting(true); setTestResult('idle');
    try {
      const challenge = `cosmos-logos-test:${Date.now()}:${crypto.randomUUID()}`;
      const encoder = new TextEncoder();
      const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(challenge));
      const localHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      const keypair = await loadOrGenerateKeypair();
      const sealed = await sealToken(challenge, agent.cosmosAgent.manifest.cryptography.public_key);
      const body = JSON.stringify({ envelope: sealed });
      const { signature, timestamp } = await signRequest(body, keypair.privateKey);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        [agent.cosmosAgent.manifest.cryptography.signing_header]: signature,
        [agent.cosmosAgent.manifest.cryptography.timestamp_header]: timestamp,
      };
      const resp = await fetch(`${agent.cosmosAgent.url}/api/cosmos/verify-envelope`, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) });
      const result = await resp.json();
      setTestResult(result.proof_hash === localHash ? 'pass' : 'fail');
    } catch { setTestResult('fail'); }
    finally { setTesting(false); }
  }

  return (
    <div className={`border border-border-muted rounded-xl overflow-hidden transition-colors ${expanded ? 'border-shell-500/30' : ''}`}>
      {/* Summary row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2 transition-colors"
        onClick={onExpand}
      >
        {/* Icon */}
        {agent.type === 'cosmos' ? (
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
          >
            {agent.icon}
          </span>
        ) : (
          <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-surface-3">
            {agent.builtinAgent?.icon}
          </span>
        )}

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{agent.name}</span>
            {agent.type === 'custom' && <span className="text-2xs text-shell-400 font-medium px-1.5 py-0.5 bg-shell-500/10 rounded-full">Custom</span>}
            {agent.type === 'cosmos' && <span className="text-2xs text-text-muted font-mono">{agent.cosmosAgent?.manifest.identity.codename}</span>}
          </div>
          <p className="text-2xs text-text-muted mt-0.5 truncate">{agent.description}</p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Security test (cosmos + developer mode) — before eye for alignment */}
          {agent.type === 'cosmos' && developerMode && (
            <button
              onClick={runSecurityTest}
              disabled={testing}
              className={`p-1.5 rounded-md transition-colors ${
                testResult === 'pass' ? 'text-green-400 bg-green-500/10' :
                testResult === 'fail' ? 'text-red-400 bg-red-500/10' :
                'text-text-muted hover:text-shell-400 hover:bg-shell-500/10'
              }`}
              title="Test secure messaging"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> :
               testResult === 'pass' ? <CheckCircle size={14} /> :
               testResult === 'fail' ? <XCircle size={14} /> :
               <Shield size={14} />}
            </button>
          )}

          {/* Visibility toggle — always last so eye icons align */}
          <button
            onClick={() => toggleVisibility(agent.id)}
            className={`p-1.5 rounded-md transition-colors ${agent.visible ? 'text-text-muted hover:text-text-secondary' : 'text-text-muted/30 hover:text-text-muted'}`}
            title={agent.visible ? 'Visible in sidebar' : 'Hidden from sidebar'}
          >
            {agent.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>

          {/* Expand arrow */}
          <ChevronDown size={14} className={`text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 py-3 border-t border-border-muted bg-surface-1 space-y-3">
          {/* Cosmos agent details */}
          {agent.cosmosAgent && (
            <>
              <div className="grid grid-cols-2 gap-2 text-2xs">
                <div><span className="text-text-muted">Version:</span> <span className="font-mono">{agent.cosmosAgent.manifest.identity.version}</span></div>
                <div><span className="text-text-muted">Algorithm:</span> <span className="font-mono">{agent.cosmosAgent.manifest.cryptography.algorithm}</span></div>
                <div><span className="text-text-muted">Endpoint:</span> <span className="font-mono truncate">{agent.cosmosAgent.url}</span></div>
                <div><span className="text-text-muted">Connected:</span> <span>{new Date(agent.cosmosAgent.connectedAt).toLocaleDateString()}</span></div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {agent.cosmosAgent.capabilities.map(cap => (
                  <span key={cap} className="text-2xs font-medium px-1.5 py-0.5 bg-surface-3 rounded-full text-text-muted">{cap}</span>
                ))}
              </div>
              {agent.cosmosAgent.manifest.display?.homepage && (
                <a href={agent.cosmosAgent.manifest.display.homepage} target="_blank" rel="noopener"
                  className="flex items-center gap-1 text-2xs text-shell-400 hover:underline">
                  <ExternalLink size={10} /> View source
                </a>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => removeCosmosAgent(agent.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-2xs text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={12} /> Disconnect
                </button>
              </div>
            </>
          )}

          {/* Built-in agent details */}
          {agent.type === 'builtin' && agent.builtinAgent && (
            <div className="text-2xs text-text-muted">
              <p>Built-in agent. {agent.builtinAgent.requiredServices.includes('olympus_grid') ? 'Requires Olympus Grid authentication.' : 'Always available.'}</p>
              {agent.builtinAgent.voice && (
                <p className="mt-1">Voice: {agent.builtinAgent.voice.description}</p>
              )}
            </div>
          )}

          {/* Custom agent details — editable */}
          {agent.type === 'custom' && agent.builtinAgent && (
            <CustomAgentEditor agent={agent.builtinAgent} />
          )}
        </div>
      )}
    </div>
  );
}

function CustomAgentEditor({ agent }: { agent: Agent }) {
  const { addAgent, removeAgent } = useAgentStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(agent.name);
  const [personality, setPersonality] = useState(agent.systemPrompt || '');
  const [icon, setIcon] = useState(agent.icon);

  function handleSave() {
    addAgent({ ...agent, name, icon, systemPrompt: personality, description: personality.substring(0, 100) });
    setEditing(false);
  }

  function handleDownload() {
    const manifest = {
      cosmos_logos_version: '1.0.3',
      identity: { name: agent.name, codename: agent.id, purpose: agent.description, system_prompt: agent.systemPrompt, version: '1.0.0' },
      display: { color: '#6366f1' },
      voice: agent.voice,
      network: { endpoint: 'local://custom-agent', health: '/health' },
      cryptography: { algorithm: 'Ed25519', public_key: '(generate with: openssl genpkey -algorithm Ed25519)', signing_header: 'x-cosmos-signature', timestamp_header: 'x-cosmos-timestamp' },
      capabilities: [{ verb: 'chat', protocol: 'openai-chat-v1', path: '/chat' }],
      trust: { ttl: 3600, agents: [] },
      envelope: { enabled: false },
      metadata: { tags: ['custom', 'chat'], created: new Date().toISOString(), license: 'personal' },
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${agent.id}.cosmos-logos.json`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        {agent.systemPrompt && <p className="text-2xs text-text-muted line-clamp-3">{agent.systemPrompt}</p>}
        {agent.voice && <p className="text-2xs text-text-muted">Voice: {agent.voice.description}</p>}
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-2xs text-text-secondary border border-border-muted rounded-lg hover:bg-surface-2 transition-colors">
            <Pencil size={12} /> Edit
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 text-2xs text-text-secondary border border-border-muted rounded-lg hover:bg-surface-2 transition-colors">
            <Download size={12} /> Download Manifest
          </button>
          <button onClick={() => removeAgent(agent.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-2xs text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors">
            <Trash2 size={12} /> Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-12 bg-surface-2 border border-border-muted rounded-lg px-2 py-1.5 text-center text-lg focus:outline-none focus:border-shell-500/50" maxLength={2} />
        <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 bg-surface-2 border border-border-muted rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-shell-500/50" />
      </div>
      <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} rows={4}
        className="w-full bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-shell-500/50 resize-none" />
      <div className="flex gap-2">
        <button onClick={handleSave} className="px-3 py-1.5 text-2xs font-semibold bg-shell-500/10 text-shell-400 rounded-lg hover:bg-shell-500/20 transition-colors">Save</button>
        <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-2xs text-text-muted hover:text-text-secondary transition-colors">Cancel</button>
      </div>
    </div>
  );
}

export function Agents() {
  const agents = useUnifiedAgents();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? agents.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()) || a.description.toLowerCase().includes(filter.toLowerCase()))
    : agents;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Setup</h1>
            <p className="text-sm text-text-muted mt-1">Manage your AI agents, connections, and visibility.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddAgent(!showAddAgent)}
              className="flex items-center gap-2 px-3 py-2 border border-border-muted text-text-secondary hover:bg-surface-2 rounded-xl text-xs font-medium transition-colors">
              <Plus size={14} /> Connect
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-3 py-2 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-xl text-xs font-semibold transition-colors">
              <Sparkles size={14} /> Create
            </button>
          </div>
        </div>

        {showCreate && <CreateAgentModal open={showCreate} onClose={() => setShowCreate(false)} />}

        {/* Add Agent Panel (collapsible) */}
        {showAddAgent && (
          <div className="bg-surface-1 border border-border-muted rounded-xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Connect cosmos-logos Agent</h3>
              <button onClick={() => setShowAddAgent(false)} className="text-text-muted hover:text-text-secondary text-xs">Close</button>
            </div>
            <AddAgentPanel />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search agents..."
            className="w-full bg-surface-1 border border-border-muted rounded-xl pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 transition-colors"
          />
        </div>

        {/* Agent list */}
        <div className="space-y-2">
          {filtered.map((agent) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              expanded={expandedId === agent.id}
              onExpand={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-text-muted text-sm py-8">No agents match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
