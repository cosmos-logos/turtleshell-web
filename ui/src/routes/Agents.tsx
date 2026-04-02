import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Sparkles, Eye, EyeOff, Pencil, Download, Trash2, ChevronDown, Shield, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useAgentStore, AGENT_CATALOG, getUserApiKeys, setUserApiKey, type UserApiKeys } from '@/lib/store/agent-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { AddAgentPanel } from '@/components/agents/AddAgentPanel';
import { CreateAgentModal } from '@/components/agents/CreateAgentModal';
import { sealToken, signRequest, loadOrGenerateKeypair } from '@/lib/cosmos-logos/crypto';
import type { Agent } from '@/types/agent';
import { agentDisplayName, type ConnectedAgent } from '@/lib/cosmos-logos/types';

// ── Agent Configuration ──────────────────────────────────────

interface AgentConfig {
  codename: string;
  name: string;
  icon: string;
  color: string;
  repo: string;
  docsPath: string;
  description: string;
  cloud: { url: string; description: string };
  developer: { defaultUrl: string; port: number; description: string };
  offgrid: { port: number; description: string };
}

/** All cosmos-logos agents with 3 deployment modes. */
const COSMOS_AGENTS: AgentConfig[] = [
  {
    codename: 'cosmos',
    name: 'Cosmos',
    icon: '🐟',
    color: '#38BDF8',
    repo: 'https://github.com/cosmos-logos/cosmos',
    docsPath: '/app/docs/getting-started',
    description: 'The Fish — navigator of agents and the digital universe',
    cloud: { url: 'https://api-int.turtleshell.ai/v1/cosmos', description: 'Official Cosmos on Olympus-Grid. Free — no Sea Shells required.' },
    developer: { defaultUrl: 'http://localhost:3901', port: 3901, description: 'Run your own Cosmos locally, expose via ngrok.' },
    offgrid: { port: 3901, description: 'Cosmos running on your TurtleShell Off-Grid.' },
  },
  {
    codename: 'logos',
    name: 'Logos',
    icon: '🐢',
    color: '#10B981',
    repo: 'https://github.com/cosmos-logos/logos',
    docsPath: '/app/docs/getting-started',
    description: 'The Turtle — ancient wisdom keeper, always available',
    cloud: { url: 'https://api-int.turtleshell.ai/v1/logos', description: 'Official Logos on Olympus-Grid. Free — no Sea Shells required.' },
    developer: { defaultUrl: 'http://localhost:3902', port: 3902, description: 'Run your own Logos locally, expose via ngrok.' },
    offgrid: { port: 3902, description: 'Logos running on your TurtleShell Off-Grid.' },
  },
  {
    codename: 'athena-616',
    name: 'Athena',
    icon: '🦉',
    color: '#C9A84C',
    repo: 'https://github.com/olympus-616/athena',
    docsPath: '/app/docs/athena',
    description: 'Multi-provider LLM gateway — the intelligence layer',
    cloud: { url: 'https://api-int.turtleshell.ai/v1/athena', description: 'Cloud-hosted on AWS via Olympus-Grid. Requires Sea Shells.' },
    developer: { defaultUrl: 'https://athena-616.ngrok.io/v1/athena', port: 3401, description: 'Run Athena on your machine, expose via ngrok.' },
    offgrid: { port: 3401, description: 'Athena inside the TurtleShell Off-Grid Docker fleet.' },
  },
  {
    codename: 'thoth',
    name: 'Thoth',
    icon: '📜',
    color: '#6366f1',
    repo: 'https://github.com/cosmos-logos/thoth',
    docsPath: '/app/docs/thoth',
    description: 'Sovereign writing agent — journal, code review, branches',
    cloud: { url: 'https://api-int.turtleshell.ai/v1/thoth', description: 'Cloud-hosted on AWS via Olympus-Grid.' },
    developer: { defaultUrl: 'http://localhost:3801', port: 3801, description: 'Run Thoth locally with Python/FastAPI.' },
    offgrid: { port: 3801, description: 'Thoth on your Off-Grid machine, natively or Docker.' },
  },
  {
    codename: 'homework-buddy',
    name: 'Homework Buddy',
    icon: '📚',
    color: '#F59E0B',
    repo: 'https://github.com/cosmos-logos/homework-buddy',
    docsPath: '/app/docs/homework-buddy',
    description: 'AI homework tutor for kids 10–17 with assignment tracking',
    cloud: { url: 'https://api-int.turtleshell.ai/v1/homework-buddy', description: 'Cloud-hosted on AWS via Olympus-Grid.' },
    developer: { defaultUrl: 'http://localhost:8080', port: 8080, description: 'Run Homework Buddy locally with Laravel/Docker.' },
    offgrid: { port: 8080, description: 'Homework Buddy inside the Off-Grid Docker fleet.' },
  },
  {
    codename: 'agora',
    name: 'Agora',
    icon: '🏛️',
    color: '#10B981',
    repo: 'https://github.com/cosmos-logos/agora',
    docsPath: '/app/docs/agora',
    description: 'Group collaboration — projects, chat, AI powered by Google Sheets',
    cloud: { url: 'https://api-int.turtleshell.ai/v1/agora', description: 'Cloud-hosted on AWS via Olympus-Grid.' },
    developer: { defaultUrl: 'http://localhost:4200', port: 4200, description: 'Run Agora locally with Angular.' },
    offgrid: { port: 4200, description: 'Agora inside the Off-Grid Docker fleet.' },
  },
];

/** BYOK providers — direct API calls, no cosmos-logos modes. */
const BYOK_AGENTS = ['claude', 'openai', 'grok', 'gemini'];

const PROVIDER_INFO: Record<string, { label: string; placeholder: string; url: string }> = {
  openai: { label: 'OpenAI API Key', placeholder: 'sk-...', url: 'https://platform.openai.com/api-keys' },
  claude: { label: 'Anthropic API Key', placeholder: 'sk-ant-...', url: 'https://console.anthropic.com/settings/keys' },
  grok: { label: 'xAI API Key', placeholder: 'xai-...', url: 'https://console.x.ai' },
  gemini: { label: 'Gemini API Key', placeholder: 'AIzaSy...', url: 'https://aistudio.google.com/apikey' },
};

// ── Helpers ──────────────────────────────────────────────────

type ModeKey = string;
function modeKey(codename: string, mode: 'cloud' | 'dev' | 'offgrid'): ModeKey {
  return `${codename}-${mode}`;
}

function findConnectedAgent(agents: ConnectedAgent[], config: AgentConfig, mode: 'cloud' | 'dev' | 'offgrid', offgridUrl = ''): ConnectedAgent | undefined {
  return agents.find(a => {
    if (a.manifest.identity.codename !== config.codename) return false;
    if (mode === 'cloud') return a.url === config.cloud.url;
    if (mode === 'offgrid') return a.url.includes(':717/') || (offgridUrl && a.url.startsWith(offgridUrl.replace(/\/+$/, '')));
    // dev = not cloud and not offgrid
    const isOffgrid = a.url.includes(':717/') || (offgridUrl && a.url.startsWith(offgridUrl.replace(/\/+$/, '')));
    return a.url !== config.cloud.url && !isOffgrid;
  });
}

// ── Shared handshake logic ──────────────────────────────────

async function performHandshake(url: string): Promise<{ manifest: any; agentUrl: string }> {
  const log = (step: string, ...args: any[]) => console.log(`%c[cosmos-logos] %c${step}`, 'color: #C9A84C; font-weight: bold', 'color: #38BDF8', ...args);
  const logDetail = (label: string, value: any) => console.log(`  %c${label}:`, 'color: #6366f1', value);

  log('Step 1/7 — Discovering manifest', `from ${url}`);
  const { fetchManifest, pingAgent } = await import('@/lib/cosmos-logos/client');
  const { manifest, agentUrl } = await fetchManifest(url);
  logDetail('Agent name', manifest.identity.name);
  logDetail('Codename', manifest.identity.codename);
  logDetail('Version', manifest.identity.version);
  logDetail('Resolved URL', agentUrl);
  logDetail('Algorithm', manifest.cryptography.algorithm);
  logDetail('Public key', manifest.cryptography.public_key.substring(0, 40) + '...');
  logDetail('Capabilities', manifest.capabilities.map((c: any) => c.verb).join(', '));

  log('Step 2/7 — Pinging agent health endpoint');
  const reachable = await pingAgent(agentUrl);
  if (!reachable) {
    log('FAILED — Agent not reachable', agentUrl);
    throw new Error(`Not reachable at ${agentUrl}`);
  }
  logDetail('Status', 'Reachable');

  log('Step 3/7 — Generating challenge');
  const challenge = `cosmos-logos-handshake:${Date.now()}:${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(challenge));
  const localHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  logDetail('Challenge', challenge.substring(0, 50) + '...');
  logDetail('Expected SHA-256', localHash);

  log('Step 4/7 — Loading Ed25519 keypair');
  const keypair = await loadOrGenerateKeypair();
  logDetail('Client public key loaded', 'Yes');

  log('Step 5/7 — Sealing challenge with agent public key (crypto_box_seal)');
  const sealed = await sealToken(challenge, manifest.cryptography.public_key);
  logDetail('Sealed envelope length', sealed.length);
  logDetail('Sealed envelope (prefix)', sealed.substring(0, 40) + '...');

  log('Step 6/7 — Signing request body with Ed25519');
  const body = JSON.stringify({ envelope: sealed });
  const { signature, timestamp } = await signRequest(body, keypair.privateKey);
  logDetail('Signature header', manifest.cryptography.signing_header);
  logDetail('Timestamp header', manifest.cryptography.timestamp_header);
  logDetail('Timestamp', timestamp);
  logDetail('Signature (prefix)', signature.substring(0, 40) + '...');

  log('Step 7/7 — Sending verify-envelope request');
  logDetail('Endpoint', `${agentUrl}/api/cosmos/verify-envelope`);
  const resp = await fetch(`${agentUrl}/api/cosmos/verify-envelope`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [manifest.cryptography.signing_header]: signature, [manifest.cryptography.timestamp_header]: timestamp },
    body, signal: AbortSignal.timeout(10000),
  });
  const result = await resp.json();
  logDetail('Response status', resp.status);
  logDetail('Server proof_hash', result.proof_hash || '(missing)');
  logDetail('Local hash match', result.proof_hash === localHash ? 'YES' : 'NO');

  if (!result.proof_hash || result.proof_hash !== localHash) {
    log('FAILED — Handshake verification failed');
    logDetail('Expected', localHash);
    logDetail('Received', result.proof_hash);
    throw new Error('Security handshake failed');
  }

  console.log(`%c[cosmos-logos] %cHandshake complete — ${manifest.identity.name} verified`, 'color: #C9A84C; font-weight: bold', 'color: #10B981; font-weight: bold');
  return { manifest, agentUrl };
}

async function runSecurityTest(agent: ConnectedAgent): Promise<boolean> {
  const log = (step: string, ...args: any[]) => console.log(`%c[cosmos-logos] %c[security-test] %c${step}`, 'color: #C9A84C; font-weight: bold', 'color: #F59E0B', 'color: #38BDF8', ...args);
  const logDetail = (label: string, value: any) => console.log(`  %c${label}:`, 'color: #6366f1', value);
  const name = agent.displayName || agent.manifest.identity.name;

  // Step 1: Re-fetch manifest to get current public key (may have been rotated)
  log(`Step 1/6 — Re-fetching manifest from ${agent.url}`);
  let manifest = agent.manifest;
  try {
    const { fetchManifest } = await import('@/lib/cosmos-logos/client');
    const result = await fetchManifest(agent.url);
    manifest = result.manifest;
    const oldKey = agent.manifest.cryptography.public_key.substring(0, 40);
    const newKey = manifest.cryptography.public_key.substring(0, 40);
    if (oldKey !== newKey) {
      log('Key rotated — updating stored manifest');
      logDetail('Old key', oldKey + '...');
      logDetail('New key', newKey + '...');
      // Update the stored agent's manifest in the cosmos store
      const cosmosStore = (await import('@/lib/cosmos-logos/store')).useCosmosLogosStore.getState();
      const agents = cosmosStore.agents.map(a =>
        a.id === agent.id ? { ...a, manifest } : a
      );
      (await import('@/lib/cosmos-logos/store')).useCosmosLogosStore.setState({ agents });
    } else {
      logDetail('Public key', 'unchanged');
    }
  } catch (e) {
    log('Warning: could not re-fetch manifest, using cached key');
  }
  logDetail('Codename', manifest.identity.codename);
  logDetail('Algorithm', manifest.cryptography.algorithm);
  logDetail('Public key', manifest.cryptography.public_key.substring(0, 40) + '...');

  log('Step 2/6 — Generating test challenge');
  const challenge = `cosmos-logos-test:${Date.now()}:${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(challenge));
  const localHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  logDetail('Challenge', challenge.substring(0, 50) + '...');
  logDetail('Expected SHA-256', localHash);

  log('Step 3/6 — Sealing challenge + loading keypair');
  const keypair = await loadOrGenerateKeypair();
  const sealed = await sealToken(challenge, manifest.cryptography.public_key);
  logDetail('Sealed envelope length', sealed.length);

  log('Step 4/6 — Signing request body');
  const body = JSON.stringify({ envelope: sealed });
  const { signature, timestamp } = await signRequest(body, keypair.privateKey);
  logDetail('Timestamp', timestamp);
  logDetail('Signature (prefix)', signature.substring(0, 40) + '...');

  log('Step 5/6 — Sending verify-envelope');
  logDetail('Endpoint', `${agent.url}/api/cosmos/verify-envelope`);
  const resp = await fetch(`${agent.url}/api/cosmos/verify-envelope`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [manifest.cryptography.signing_header]: signature, [manifest.cryptography.timestamp_header]: timestamp },
    body, signal: AbortSignal.timeout(10000),
  });
  const result = await resp.json();
  log('Step 6/6 — Verifying proof');
  logDetail('Response status', resp.status);
  logDetail('Server proof_hash', result.proof_hash || '(missing)');
  logDetail('Local hash match', result.proof_hash === localHash ? 'YES' : 'NO');

  const passed = result.proof_hash === localHash;
  if (passed) {
    console.log(`%c[cosmos-logos] %c[security-test] %c${name} — PASSED`, 'color: #C9A84C; font-weight: bold', 'color: #F59E0B', 'color: #10B981; font-weight: bold');
  } else {
    console.log(`%c[cosmos-logos] %c[security-test] %c${name} — FAILED`, 'color: #C9A84C; font-weight: bold', 'color: #F59E0B', 'color: #EF4444; font-weight: bold');
    logDetail('Expected', localHash);
    logDetail('Received', result.proof_hash);
  }
  return passed;
}

// ── Mode Accordion Row ──────────────────────────────────────

function ModeRow({ config, mode, cosmosAgents, connecting, onConnect, onDisconnect, devUrl, devName, offgridUrl, onDevUrl, onDevName, onOffgridUrl, securityTesting, securityResult, onSecurityTest }: {
  config: AgentConfig; mode: 'cloud' | 'dev' | 'offgrid'; cosmosAgents: ConnectedAgent[];
  connecting: string | null; onConnect: () => void; onDisconnect: () => void;
  devUrl: string; devName: string; offgridUrl: string;
  onDevUrl: (v: string) => void; onDevName: (v: string) => void; onOffgridUrl: (v: string) => void;
  securityTesting: boolean; securityResult: 'pass' | 'fail' | null; onSecurityTest: () => void;
}) {
  const toggleVisibility = useAgentStore((s) => s.toggleVisibility);
  const hiddenIds = useAgentStore((s) => s.hiddenAgentIds);
  const key = modeKey(config.codename, mode);
  const isLoading = connecting === key;
  const connectedAgent = findConnectedAgent(cosmosAgents, config, mode, offgridUrl);
  const connected = !!connectedAgent;

  const label = mode === 'cloud' ? '☁️ Olympus-Grid' : mode === 'dev' ? '🔧 Developer' : '🐢 Off-Grid';
  const modeColor = mode === 'cloud' ? '#C9A84C' : mode === 'dev' ? '#8B5CF6' : '#10B981';
  const desc = mode === 'cloud' ? config.cloud.description : mode === 'dev' ? config.developer.description : config.offgrid.description;

  const canConnect = mode === 'cloud' ? true
    : mode === 'dev' ? !!(devUrl.trim() && devName.trim())
    : !!offgridUrl.trim();

  return (
    <div className={`border rounded-lg px-3 py-2 transition-colors ${connected ? 'border-green-500/30 bg-green-500/3' : 'border-border-muted'}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xs font-semibold" style={{ color: modeColor }}>{label}</span>
        <span className="flex-1 text-2xs text-text-muted truncate">{desc}</span>
        {connected && <CheckCircle size={11} className="text-green-400 flex-shrink-0" />}
      </div>

      {connected ? (
        <div className="flex items-center gap-1.5 mt-2">
          <button onClick={() => toggleVisibility(connectedAgent.id)}
            className="flex items-center gap-1 px-2 py-0.5 text-2xs rounded-md bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text-secondary transition-colors">
            {hiddenIds.has(connectedAgent.id) ? <><EyeOff size={9} /> Hidden</> : <><Eye size={9} /> Visible</>}
          </button>
          <button onClick={onSecurityTest} disabled={securityTesting}
            className={`flex items-center gap-1 px-2 py-0.5 text-2xs rounded-md transition-colors ${
              securityResult === 'pass' ? 'bg-green-500/10 text-green-400' :
              securityResult === 'fail' ? 'bg-red-500/10 text-red-400' :
              'bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text-secondary'
            }`}>
            {securityTesting ? <Loader2 size={9} className="animate-spin" /> :
             securityResult === 'pass' ? <CheckCircle size={9} /> :
             securityResult === 'fail' ? <XCircle size={9} /> : <Shield size={9} />}
            {securityResult === 'pass' ? 'Secure' : securityResult === 'fail' ? 'Failed' : 'Test'}
          </button>
          {mode === 'offgrid' && connectedAgent && (() => {
            const base = connectedAgent.url.replace(/\/v1\/.*$/, '');
            return (
              <a href={`${base}/nodestatus`} target="_blank" rel="noopener"
                className="flex items-center gap-1 px-2 py-0.5 text-2xs rounded-md bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text-secondary transition-colors">
                <ExternalLink size={9} /> Node Status
              </a>
            );
          })()}
          <button onClick={onDisconnect} className="text-2xs text-red-400/60 hover:text-red-400 ml-auto transition-colors">
            Disconnect
          </button>
        </div>
      ) : (
        <div className="mt-2 space-y-1.5">
          {mode === 'dev' && (
            <div className="flex gap-1.5">
              <input value={devName} onChange={(e) => onDevName(e.target.value)} placeholder={`my-${config.name.toLowerCase()}`}
                className="flex-1 bg-surface-2 border border-border-muted rounded-md px-2 py-1 text-2xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50" />
              <input value={devUrl} onChange={(e) => onDevUrl(e.target.value)} placeholder={config.developer.defaultUrl}
                className="flex-[2] bg-surface-2 border border-border-muted rounded-md px-2 py-1 text-2xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50" />
            </div>
          )}
          {mode === 'offgrid' && (
            <input value={offgridUrl} onChange={(e) => onOffgridUrl(e.target.value)}
              placeholder={`https://100.x.x.x:717/v1/${config.codename === 'athena-616' ? 'athena' : config.codename}`}
              className="w-full bg-surface-2 border border-border-muted rounded-md px-2 py-1 text-2xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50" />
          )}
          <button onClick={onConnect} disabled={isLoading || !canConnect}
            className="flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold rounded-md transition-colors disabled:opacity-40"
            style={{ backgroundColor: `${modeColor}15`, color: modeColor }}>
            {isLoading ? <Loader2 size={9} className="animate-spin" /> : <Shield size={9} />}
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Unified Agent Row ───────────────────────────────────────

function AgentRow({ agent, expanded, onExpand }: {
  agent: { id: string; type: 'cosmos-agent' | 'byok' | 'custom'; config?: AgentConfig; builtinAgent?: Agent; name: string; icon: string; description: string; color: string; visible: boolean };
  expanded: boolean; onExpand: () => void;
}) {
  const toggleVisibility = useAgentStore((s) => s.toggleVisibility);
  const cosmosAgents = useCosmosLogosStore((s) => s.agents);
  const cosmosStore = useCosmosLogosStore();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [securityTesting, setSecurityTesting] = useState<string | null>(null);
  const [securityResult, setSecurityResult] = useState<Record<string, 'pass' | 'fail'>>({});
  const [devUrls, setDevUrls] = useState<Record<string, string>>({});
  const [devNames, setDevNames] = useState<Record<string, string>>({});
  const [offgridUrls, setOffgridUrls] = useState<Record<string, string>>({});

  // Count connected modes for this agent
  const connectedCount = agent.config
    ? (['cloud', 'dev', 'offgrid'] as const).filter(m => findConnectedAgent(cosmosAgents, agent.config!, m, offgridUrls[agent.config!.codename] ?? '')).length
    : 0;

  const handleConnect = async (mode: 'cloud' | 'dev' | 'offgrid') => {
    if (!agent.config) return;
    const key = modeKey(agent.config.codename, mode);
    const url = mode === 'cloud' ? agent.config.cloud.url
      : mode === 'dev' ? (devUrls[agent.config.codename] ?? agent.config.developer.defaultUrl).trim()
      : (offgridUrls[agent.config.codename] ?? '').trim();
    if (!url) { setError('Enter your URL'); return; }

    setConnecting(key); setError(null);
    try {
      const { manifest, agentUrl } = await performHandshake(url);
      const displayName = mode === 'dev'
        ? (devNames[agent.config.codename] ?? `${agent.config.name.toLowerCase()}-dev`).trim() || agent.config.name
        : mode === 'offgrid' ? `${agent.config.name} Off-Grid` : agent.config.name;
      cosmosStore.addAgent(agentUrl, manifest, displayName);
      useAgentStore.getState().reloadHidden();
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    }
    setConnecting(null);
  };

  const handleDisconnect = (mode: 'cloud' | 'dev' | 'offgrid') => {
    if (!agent.config) return;
    const ca = findConnectedAgent(cosmosAgents, agent.config, mode, offgridUrls[agent.config.codename] ?? '');
    if (ca) { cosmosStore.removeAgent(ca.id); useAgentStore.getState().reloadHidden(); }
  };

  const handleSecurityTest = async (mode: 'cloud' | 'dev' | 'offgrid') => {
    if (!agent.config) return;
    const key = modeKey(agent.config.codename, mode);
    const ca = findConnectedAgent(cosmosAgents, agent.config, mode, offgridUrls[agent.config.codename] ?? '');
    if (!ca) return;
    setSecurityTesting(key);
    setSecurityResult(prev => { const next = { ...prev }; delete next[key]; return next; });
    try {
      const passed = await runSecurityTest(ca);
      setSecurityResult(prev => ({ ...prev, [key]: passed ? 'pass' : 'fail' }));
    } catch { setSecurityResult(prev => ({ ...prev, [key]: 'fail' })); }
    finally { setSecurityTesting(null); }
  };

  // Is this a BYOK agent with a key?
  const isBYOK = agent.type === 'byok';
  const byokHasKey = isBYOK && !!getUserApiKeys()[agent.id as keyof UserApiKeys];

  return (
    <div className={`border border-border-muted rounded-xl overflow-hidden transition-colors ${expanded ? 'border-shell-500/30' : ''}`}>
      {/* Summary row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2 transition-colors" onClick={onExpand}>
        <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-surface-3">{agent.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{agent.name}</span>
            {agent.type === 'custom' && <span className="text-2xs text-shell-400 font-medium px-1.5 py-0.5 bg-shell-500/10 rounded-full">Custom</span>}
            {connectedCount > 0 && (
              <span className="text-2xs text-green-400 font-medium px-1.5 py-0.5 bg-green-500/10 rounded-full">{connectedCount} connected</span>
            )}
            {isBYOK && byokHasKey && (
              <span className="text-2xs text-green-400 font-medium px-1.5 py-0.5 bg-green-500/10 rounded-full">Key saved</span>
            )}
          </div>
          <p className="text-2xs text-text-muted mt-0.5 truncate">{agent.description}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Visibility toggle for BYOK agents */}
          {isBYOK && (
            <button
              onClick={() => byokHasKey && toggleVisibility(agent.id)}
              disabled={!byokHasKey}
              className={`p-1.5 rounded-md transition-colors ${!byokHasKey ? 'text-text-muted/15 cursor-not-allowed' : agent.visible ? 'text-text-muted hover:text-text-secondary' : 'text-text-muted/30 hover:text-text-muted'}`}
              title={!byokHasKey ? 'Add API key to enable' : agent.visible ? 'Visible in sidebar' : 'Hidden from sidebar'}
            >
              {agent.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          )}
          <ChevronDown size={14} className={`text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 py-3 border-t border-border-muted bg-surface-1 space-y-3">
          {/* Cosmos-logos agent: 3 deployment modes */}
          {agent.type === 'cosmos-agent' && agent.config && (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-2xs text-text-muted">Choose how to run {agent.config.name}:</p>
                <div className="flex items-center gap-3 text-2xs">
                  <a href={agent.config.repo} target="_blank" rel="noopener" className="text-text-muted hover:text-shell-400 transition-colors flex items-center gap-1">
                    <ExternalLink size={10} /> GitHub
                  </a>
                  <a href={agent.config.docsPath} className="text-text-muted hover:text-shell-400 transition-colors">Docs</a>
                </div>
              </div>
              {error && <div className="text-2xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-1.5">{error}</div>}
              <div className="space-y-1.5">
                {(['cloud', 'dev', 'offgrid'] as const).map((mode) => (
                  <ModeRow key={mode} config={agent.config!} mode={mode} cosmosAgents={cosmosAgents}
                    connecting={connecting} onConnect={() => handleConnect(mode)} onDisconnect={() => handleDisconnect(mode)}
                    devUrl={devUrls[agent.config!.codename] ?? agent.config!.developer.defaultUrl}
                    devName={devNames[agent.config!.codename] ?? `${agent.config!.name.toLowerCase()}-dev`}
                    offgridUrl={offgridUrls[agent.config!.codename] ?? ''}
                    onDevUrl={(v) => setDevUrls(p => ({ ...p, [agent.config!.codename]: v }))}
                    onDevName={(v) => setDevNames(p => ({ ...p, [agent.config!.codename]: v }))}
                    onOffgridUrl={(v) => setOffgridUrls(p => ({ ...p, [agent.config!.codename]: v }))}
                    securityTesting={securityTesting === modeKey(agent.config!.codename, mode)}
                    securityResult={securityResult[modeKey(agent.config!.codename, mode)] ?? null}
                    onSecurityTest={() => handleSecurityTest(mode)} />
                ))}
              </div>
            </>
          )}

          {/* BYOK agent: API key input */}
          {agent.type === 'byok' && <ApiKeyInput agentId={agent.id} />}

          {/* Custom agent: edit/download/remove */}
          {agent.type === 'custom' && agent.builtinAgent && <CustomAgentEditor agent={agent.builtinAgent} />}
        </div>
      )}
    </div>
  );
}

// ── API Key Input ───────────────────────────────────────────

const PROVIDER_CONFIGS: Record<string, { name: string; endpoint: string; model: string; authHeader: string; color: string }> = {
  openai:  { name: 'OpenAI',    endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini',              authHeader: 'Authorization: Bearer', color: '#10A37F' },
  claude:  { name: 'Anthropic',  endpoint: 'https://api.anthropic.com/v1/messages',      model: 'claude-haiku-4-5-20251001', authHeader: 'x-api-key',             color: '#D97706' },
  grok:    { name: 'xAI Grok',   endpoint: 'https://api.x.ai/v1/chat/completions',       model: 'grok-3-mini',              authHeader: 'Authorization: Bearer', color: '#EF4444' },
  gemini:  { name: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash', model: 'gemini-2.5-flash', authHeader: 'URL param', color: '#4285F4' },
};

async function testProviderKey(providerId: string, apiKey: string): Promise<string> {
  const cfg = PROVIDER_CONFIGS[providerId] || { name: providerId, endpoint: 'unknown', model: 'unknown', authHeader: 'unknown', color: '#6366f1' };
  const log = (step: string, ...args: any[]) => console.log(`%c[turtleshell] %c[${cfg?.name || providerId}] %c${step}`, 'color: #C9A84C; font-weight: bold', `color: ${cfg?.color || '#6366f1'}; font-weight: bold`, 'color: #38BDF8', ...args);
  const logDetail = (label: string, value: any) => console.log(`  %c${label}:`, 'color: #6366f1', value);

  log('Step 1/4 — Validating API key');
  logDetail('Provider', cfg?.name || providerId);
  logDetail('Key prefix', apiKey.substring(0, 8) + '...');
  logDetail('Key length', apiKey.length);

  log('Step 2/4 — Preparing test request');
  logDetail('Endpoint', cfg?.endpoint || 'unknown');
  logDetail('Model', cfg?.model || 'unknown');
  logDetail('Auth method', cfg?.authHeader || 'unknown');
  logDetail('Prompt', 'Say "hello" in one word.');
  logDetail('Max tokens', 5);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const startTime = performance.now();

  try {
    log('Step 3/4 — Sending request...');

    if (providerId === 'openai') {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Say "hello" in one word.' }], max_tokens: 5 }),
      });
      const elapsed = Math.round(performance.now() - startTime);
      logDetail('Response status', resp.status);
      logDetail('Latency', `${elapsed}ms`);
      if (!resp.ok) { const e = await resp.text(); log('FAILED', `${resp.status}`); logDetail('Error', e.substring(0, 200)); throw new Error(`${resp.status}: ${e.substring(0, 120)}`); }
      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || 'OK';
      logDetail('Model used', data.model);
      logDetail('Usage', `${data.usage?.prompt_tokens} prompt + ${data.usage?.completion_tokens} completion = ${data.usage?.total_tokens} tokens`);
      log('Step 4/4 — Response received');
      logDetail('Reply', reply);
      console.log(`%c[turtleshell] %c[${cfg.name}] %cPASSED — ${elapsed}ms`, 'color: #C9A84C; font-weight: bold', `color: ${cfg.color}; font-weight: bold`, 'color: #10B981; font-weight: bold');
      return reply;
    }
    if (providerId === 'claude') {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'Say "hello" in one word.' }] }),
      });
      const elapsed = Math.round(performance.now() - startTime);
      logDetail('Response status', resp.status);
      logDetail('Latency', `${elapsed}ms`);
      if (!resp.ok) { const e = await resp.text(); log('FAILED', `${resp.status}`); logDetail('Error', e.substring(0, 200)); throw new Error(`${resp.status}: ${e.substring(0, 120)}`); }
      const data = await resp.json();
      const reply = data.content?.[0]?.text || 'OK';
      logDetail('Model used', data.model);
      logDetail('Usage', `${data.usage?.input_tokens} input + ${data.usage?.output_tokens} output tokens`);
      log('Step 4/4 — Response received');
      logDetail('Reply', reply);
      console.log(`%c[turtleshell] %c[${cfg.name}] %cPASSED — ${elapsed}ms`, 'color: #C9A84C; font-weight: bold', `color: ${cfg.color}; font-weight: bold`, 'color: #10B981; font-weight: bold');
      return reply;
    }
    if (providerId === 'grok') {
      const resp = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'grok-3-mini', messages: [{ role: 'user', content: 'Say "hello" in one word.' }], max_tokens: 5 }),
      });
      const elapsed = Math.round(performance.now() - startTime);
      logDetail('Response status', resp.status);
      logDetail('Latency', `${elapsed}ms`);
      if (!resp.ok) { const e = await resp.text(); log('FAILED', `${resp.status}`); logDetail('Error', e.substring(0, 200)); throw new Error(`${resp.status}: ${e.substring(0, 120)}`); }
      const data = await resp.json();
      const reply = data.choices?.[0]?.message?.content || 'OK';
      logDetail('Model used', data.model);
      logDetail('Usage', `${data.usage?.prompt_tokens} prompt + ${data.usage?.completion_tokens} completion = ${data.usage?.total_tokens} tokens`);
      log('Step 4/4 — Response received');
      logDetail('Reply', reply);
      console.log(`%c[turtleshell] %c[${cfg.name}] %cPASSED — ${elapsed}ms`, 'color: #C9A84C; font-weight: bold', `color: ${cfg.color}; font-weight: bold`, 'color: #10B981; font-weight: bold');
      return reply;
    }
    if (providerId === 'gemini') {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Say "hello" in one word.' }] }], generationConfig: { maxOutputTokens: 5 } }),
      });
      const elapsed = Math.round(performance.now() - startTime);
      logDetail('Response status', resp.status);
      logDetail('Latency', `${elapsed}ms`);
      if (!resp.ok) { const e = await resp.text(); log('FAILED', `${resp.status}`); logDetail('Error', e.substring(0, 200)); throw new Error(`${resp.status}: ${e.substring(0, 120)}`); }
      const data = await resp.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
      logDetail('Model used', 'gemini-2.5-flash');
      logDetail('Token count', data.usageMetadata?.totalTokenCount || 'N/A');
      log('Step 4/4 — Response received');
      logDetail('Reply', reply);
      console.log(`%c[turtleshell] %c[${cfg.name}] %cPASSED — ${elapsed}ms`, 'color: #C9A84C; font-weight: bold', `color: ${cfg.color}; font-weight: bold`, 'color: #10B981; font-weight: bold');
      return reply;
    }
    throw new Error('Unknown provider');
  } finally { clearTimeout(timeout); }
}

function ApiKeyInput({ agentId }: { agentId: string }) {
  const info = PROVIDER_INFO[agentId];
  const toggleVisibility = useAgentStore((s) => s.toggleVisibility);
  const hiddenIds = useAgentStore((s) => s.hiddenAgentIds);
  const [key, setKey] = useState(getUserApiKeys()[agentId as keyof UserApiKeys] || '');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'pass' | 'fail'; message: string } | null>(null);

  if (!info) return null;

  const handleSave = () => {
    setUserApiKey(agentId as keyof UserApiKeys, key);
    if (key.trim() && hiddenIds.has(agentId)) toggleVisibility(agentId);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setKey('');
    setUserApiKey(agentId as keyof UserApiKeys, '');
    if (!hiddenIds.has(agentId)) toggleVisibility(agentId);
    setSaved(false);
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!key.trim()) return;
    // Save first so the key is available
    setUserApiKey(agentId as keyof UserApiKeys, key);
    setTesting(true);
    setTestResult(null);
    try {
      const reply = await testProviderKey(agentId, key.trim());
      setTestResult({ status: 'pass', message: reply.trim() });
      // Auto-show on successful test
      if (hiddenIds.has(agentId)) toggleVisibility(agentId);
    } catch (e: any) {
      setTestResult({ status: 'fail', message: e.message || 'Connection failed' });
    }
    setTesting(false);
  };

  const hasKey = !!key.trim();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-2xs font-semibold text-text-secondary">{info.label}</label>
        <a href={info.url} target="_blank" rel="noopener" className="text-2xs text-shell-400 hover:underline">Get key →</a>
      </div>
      <div className="flex gap-2">
        <input type={show ? 'text' : 'password'} value={key} onChange={(e) => { setKey(e.target.value); setSaved(false); setTestResult(null); }}
          placeholder={info.placeholder}
          className="flex-1 bg-surface-2 border border-border-muted rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50" />
        <button onClick={() => setShow(!show)} className="px-2 py-1.5 text-2xs text-text-muted border border-border-muted rounded-lg hover:bg-surface-2">
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleSave} disabled={!key.trim()}
          className="px-3 py-1.5 text-2xs font-semibold bg-shell-500/10 text-shell-400 rounded-lg hover:bg-shell-500/20 disabled:opacity-40">Save</button>
        <button onClick={handleTest} disabled={!key.trim() || testing}
          className={`flex items-center gap-1 px-3 py-1.5 text-2xs font-semibold rounded-lg transition-colors disabled:opacity-40 ${
            testResult?.status === 'pass' ? 'bg-green-500/10 text-green-400' :
            testResult?.status === 'fail' ? 'bg-red-500/10 text-red-400' :
            'bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text-secondary'
          }`}>
          {testing ? <Loader2 size={10} className="animate-spin" /> :
           testResult?.status === 'pass' ? <CheckCircle size={10} /> :
           testResult?.status === 'fail' ? <XCircle size={10} /> :
           <Shield size={10} />}
          {testing ? 'Testing...' : testResult?.status === 'pass' ? 'Connected' : testResult?.status === 'fail' ? 'Failed' : 'Test'}
        </button>
        {hasKey && <button onClick={handleClear} className="px-3 py-1.5 text-2xs text-red-400 hover:text-red-300">Clear</button>}
        {saved && <span className="text-2xs text-green-400">Saved</span>}
      </div>
      {testResult && (
        <p className={`text-2xs ${testResult.status === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
          {testResult.status === 'pass' ? `Response: "${testResult.message}"` : testResult.message}
        </p>
      )}
      <p className="text-2xs text-text-muted">
        {hasKey ? 'Your key is stored locally. Chat goes directly to the provider — no proxy.' : 'Add your API key to chat directly with this provider. Your key never leaves your browser.'}
      </p>
    </div>
  );
}

// ── Custom Agent Editor ─────────────────────────────────────

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

// ── Main Page ───────────────────────────────────────────────

function useAgentList() {
  const builtinAgents = useAgentStore((s) => s.agents);
  const cosmosAgents = useCosmosLogosStore((s) => s.agents);
  const hiddenIds = useAgentStore((s) => s.hiddenAgentIds);
  const catalogIds = new Set(AGENT_CATALOG.map(a => a.id));
  const cosmosCodenames = new Set(COSMOS_AGENTS.map(a => a.codename));

  type AgentEntry = { id: string; type: 'cosmos-agent' | 'byok' | 'custom'; config?: AgentConfig; builtinAgent?: Agent; name: string; icon: string; description: string; color: string; visible: boolean };

  const entries: AgentEntry[] = [];

  // 1. Cosmos-logos agents (in defined order)
  for (const config of COSMOS_AGENTS) {
    const builtinAgent = builtinAgents.find(a => a.id === config.codename);
    entries.push({
      id: config.codename,
      type: 'cosmos-agent',
      config,
      builtinAgent,
      name: config.name,
      icon: config.icon,
      description: config.description,
      color: config.color,
      visible: !hiddenIds.has(config.codename),
    });
  }

  // 2. BYOK providers (in order)
  for (const id of BYOK_AGENTS) {
    const ba = builtinAgents.find(a => a.id === id);
    if (ba) {
      entries.push({
        id, type: 'byok', builtinAgent: ba,
        name: ba.name, icon: ba.icon, description: ba.description,
        color: '#6366f1', visible: !hiddenIds.has(id),
      });
    }
  }

  // 3. Custom agents
  for (const a of builtinAgents) {
    if (!catalogIds.has(a.id)) {
      entries.push({
        id: a.id, type: 'custom', builtinAgent: a,
        name: a.name, icon: a.icon, description: a.description,
        color: '#6366f1', visible: !hiddenIds.has(a.id),
      });
    }
  }

  // 4. Unknown cosmos agents (not in COSMOS_AGENTS config)
  for (const ca of cosmosAgents) {
    if (!cosmosCodenames.has(ca.manifest.identity.codename) && !entries.find(e => e.id === ca.id)) {
      const name = agentDisplayName(ca);
      entries.push({
        id: ca.id, type: 'cosmos-agent' as const,
        name, icon: name.charAt(0), description: ca.manifest.identity.purpose || '',
        color: ca.manifest.display?.color || '#6366f1', visible: !hiddenIds.has(ca.id),
      });
    }
  }

  return entries;
}

function AutoConnect() {
  const [searchParams, setSearchParams] = useSearchParams();
  const connectUrl = searchParams.get('connect');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const attempted = useRef(false);
  const cosmosStore = useCosmosLogosStore();

  useEffect(() => {
    if (!connectUrl || attempted.current) return;
    attempted.current = true;
    setStatus('connecting');
    setMessage(`Connecting to ${connectUrl}...`);

    (async () => {
      try {
        const { manifest, agentUrl } = await performHandshake(connectUrl);
        const name = manifest.identity.name || manifest.identity.codename;
        cosmosStore.addAgent(agentUrl, manifest, name);
        useAgentStore.getState().reloadHidden();
        setStatus('success');
        setMessage(`${name} connected and verified`);
        // Clear the connect param from URL
        searchParams.delete('connect');
        setSearchParams(searchParams, { replace: true });
      } catch (e: any) {
        setStatus('error');
        setMessage(e.message || 'Connection failed');
      }
    })();
  }, [connectUrl]);

  if (!connectUrl && status === 'idle') return null;

  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 animate-fade-in ${
      status === 'connecting' ? 'bg-shell-500/5 border border-shell-500/20' :
      status === 'success' ? 'bg-green-500/5 border border-green-500/20' :
      status === 'error' ? 'bg-red-500/5 border border-red-500/20' :
      'bg-surface-1 border border-border-muted'
    }`}>
      {status === 'connecting' && <Loader2 size={18} className="animate-spin text-shell-400" />}
      {status === 'success' && <CheckCircle size={18} className="text-green-400" />}
      {status === 'error' && <XCircle size={18} className="text-red-400" />}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${
          status === 'success' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-text-primary'
        }`}>
          {status === 'connecting' ? 'Connecting...' : status === 'success' ? 'Connected' : status === 'error' ? 'Connection Failed' : ''}
        </div>
        <div className="text-2xs text-text-muted truncate">{message}</div>
      </div>
      {status === 'error' && (
        <button onClick={() => { attempted.current = false; setStatus('idle'); }}
          className="text-2xs text-shell-400 hover:text-shell-300">Retry</button>
      )}
    </div>
  );
}

export function Agents() {
  const agents = useAgentList();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? agents.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()) || a.description.toLowerCase().includes(filter.toLowerCase()))
    : agents;

  return (
    <div className="flex-1 overflow-y-auto relative z-0">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Setup</h1>
            <p className="text-sm text-text-muted mt-1">Each agent runs in 3 modes: Olympus-Grid, Developer, or Off-Grid.</p>
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

        {/* Auto-connect from QR code / deep link */}
        <AutoConnect />

        {showCreate && <CreateAgentModal open={showCreate} onClose={() => setShowCreate(false)} />}

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
        <div className="relative z-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search agents..."
            className="w-full bg-surface-1 border border-border-muted rounded-xl pl-9 pr-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 transition-colors" />
        </div>

        {/* Unified agent list */}
        <div className="space-y-2">
          {filtered.map((agent) => (
            <AgentRow key={agent.id} agent={agent}
              expanded={expandedId === agent.id}
              onExpand={() => setExpandedId(expandedId === agent.id ? null : agent.id)} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-text-muted text-sm py-8">No agents match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
