import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, Loader2, CheckCircle } from 'lucide-react';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { sealToken, signRequest, loadOrGenerateKeypair } from '@/lib/cosmos-logos/crypto';
import { fetchManifest } from '@/lib/cosmos-logos/client';
import type { OlympusAgent } from '@/lib/agents/olympus-data';
import type { AgentConfig } from '@/routes/Agents';

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}

interface Props {
  agent: OlympusAgent;
  config: AgentConfig | null;
  onClose: () => void;
}

type Mode = 'cloud' | 'dev' | 'offgrid';

export function OlympusConnectPanel({ agent, config, onClose }: Props) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState(config?.developer.defaultUrl ?? '');
  const [devName, setDevName] = useState('');
  const [offgridUrl, setOffgridUrl] = useState('');
  const cosmosStore = useCosmosLogosStore();
  const rgb = hexToRgb(agent.godColor);

  if (!config) return null;

  const findConnected = (mode: Mode) => {
    return cosmosStore.agents.find(a => {
      const codename = a.manifest.identity.codename;
      if (codename !== config.codename && a.url !== config.cloud.url) return false;
      if (a.connectionMode) return a.connectionMode === mode;
      if (mode === 'cloud') return a.url === config.cloud.url;
      if (mode === 'offgrid') return a.url.includes(':717/');
      return a.url !== config.cloud.url && !a.url.includes(':717/');
    });
  };

  const handleConnect = async (mode: Mode) => {
    let url = '';
    if (mode === 'cloud') url = config.cloud.url;
    else if (mode === 'dev') url = devUrl;
    else url = offgridUrl;

    if (!url.trim()) { setError('Enter a URL'); return; }
    const key = `${config.codename}-${mode}`;
    setConnecting(key);
    setError(null);

    try {
      const agentUrl = url.trim().replace(/\/+$/, '');
      const { manifest } = await fetchManifest(agentUrl);

      const challenge = `cosmos-logos-handshake:${Date.now()}:${crypto.randomUUID()}`;
      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(challenge));
      const localHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

      const keypair = await loadOrGenerateKeypair();
      const sealed = await sealToken(challenge, manifest.cryptography.public_key);
      const body = JSON.stringify({ envelope: sealed });
      const { signature, timestamp } = await signRequest(body, keypair.privateKey);

      const res = await fetch(`${agentUrl}/api/cosmos/verify-envelope`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [manifest.cryptography.signing_header]: signature,
          [manifest.cryptography.timestamp_header]: timestamp,
        },
        body,
      });
      const result = await res.json();
      if (result.proof_hash !== localHash) throw new Error('Handshake failed — hash mismatch');

      const displayName = mode === 'cloud' ? `${agent.name} (Olympus-Grid)`
        : mode === 'dev' ? (devName || `${agent.name} (Developer)`)
        : `${agent.name} (Off-Grid)`;

      cosmosStore.addAgent(agentUrl, manifest, displayName, mode);
    } catch (e) {
      setError((e as Error).message);
    }
    setConnecting(null);
  };

  const handleDisconnect = (mode: Mode) => {
    const ca = findConnected(mode);
    if (ca) cosmosStore.removeAgent(ca.id);
  };

  const modeRows: { mode: Mode; icon: string; label: string; desc: string }[] = [
    { mode: 'cloud', icon: '☁️', label: 'Olympus-Grid', desc: config.cloud.description },
    { mode: 'dev', icon: '🔧', label: 'Developer', desc: config.developer.description },
    { mode: 'offgrid', icon: '🐢', label: 'Off-Grid', desc: config.offgrid.description },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md overflow-y-auto"
        style={{
          background: '#070d1c',
          borderLeft: `1px solid rgba(${rgb}, 0.12)`,
          animationName: 'ocean-slide-in',
          animationDuration: '0.3s',
          animationTimingFunction: 'ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(${rgb}, 0.015) 1px, transparent 1px), linear-gradient(0deg, rgba(${rgb}, 0.015) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Header */}
        <div className="sticky top-0 z-10 p-6 pb-4 flex items-center justify-between relative" style={{ background: '#070d1c', borderBottom: `1px solid rgba(${rgb}, 0.1)` }}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{agent.godEmoji}</span>
            <div>
              <h2 className="font-cinzel text-xl font-bold" style={{ color: '#d0e8ff' }}>{agent.name}</h2>
              <div className="text-2xs uppercase tracking-[0.2em]" style={{ color: agent.godColor }}>{agent.godTitle}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} style={{ color: '#5080b0' }} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 px-3 py-2 rounded-lg text-xs text-red-400 relative" style={{ background: 'rgba(220,40,40,0.1)', border: '1px solid rgba(220,40,40,0.2)' }}>
            {error}
          </div>
        )}

        <div className="p-6 space-y-4 relative">
          <div className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: '#1a3060' }}>
            Deploy {agent.name}:
          </div>

          {modeRows.map(({ mode, icon, label, desc }) => {
            const connected = findConnected(mode);
            const isConnecting = connecting === `${config.codename}-${mode}`;

            return (
              <div key={mode} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(${rgb}, 0.08)` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-semibold" style={{ color: agent.godColor }}>{label}</span>
                  {connected && <CheckCircle size={12} className="text-green-500 ml-auto" />}
                </div>
                <div className="text-2xs mb-3" style={{ color: '#5080b0' }}>{desc}</div>

                {connected ? (
                  <button
                    onClick={() => handleDisconnect(mode)}
                    className="text-2xs px-3 py-1 rounded-md transition-colors"
                    style={{ color: '#e05050', border: '1px solid rgba(224,80,80,0.2)' }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <div className="space-y-2">
                    {mode === 'dev' && (
                      <>
                        <input
                          value={devName}
                          onChange={e => setDevName(e.target.value)}
                          placeholder={`${agent.name} (Developer)`}
                          className="w-full px-3 py-1.5 rounded-md text-xs bg-transparent outline-none"
                          style={{ border: `1px solid rgba(${rgb}, 0.12)`, color: '#d0e8ff' }}
                        />
                        <input
                          value={devUrl}
                          onChange={e => setDevUrl(e.target.value)}
                          placeholder={config.developer.defaultUrl}
                          className="w-full px-3 py-1.5 rounded-md text-xs font-mono bg-transparent outline-none"
                          style={{ border: `1px solid rgba(${rgb}, 0.12)`, color: '#d0e8ff' }}
                        />
                      </>
                    )}
                    {mode === 'offgrid' && (
                      <input
                        value={offgridUrl}
                        onChange={e => setOffgridUrl(e.target.value)}
                        placeholder={`https://100.x.x.x:717/v1/${config.codename.replace('-616', '')}`}
                        className="w-full px-3 py-1.5 rounded-md text-xs font-mono bg-transparent outline-none"
                        style={{ border: `1px solid rgba(${rgb}, 0.12)`, color: '#d0e8ff' }}
                      />
                    )}
                    <button
                      onClick={() => handleConnect(mode)}
                      disabled={isConnecting}
                      className="flex items-center gap-1.5 text-2xs px-3 py-1 rounded-md transition-colors"
                      style={{
                        color: agent.godColor,
                        border: `1px solid rgba(${rgb}, 0.3)`,
                        opacity: isConnecting ? 0.5 : 1,
                      }}
                    >
                      {isConnecting ? <Loader2 size={10} className="animate-spin" /> : <Shield size={10} />}
                      Connect
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
