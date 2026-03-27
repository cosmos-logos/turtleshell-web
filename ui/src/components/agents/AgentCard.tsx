import { useState } from 'react';
import { Trash2, ExternalLink, Shield, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { sealToken, signRequest, loadOrGenerateKeypair } from '@/lib/cosmos-logos/crypto';
import type { ConnectedAgent } from '@/lib/cosmos-logos/types';

interface AgentCardProps {
  agent: ConnectedAgent;
  onDisconnect: () => void;
}

export function AgentCard({ agent, onDisconnect }: AgentCardProps) {
  const manifest = agent.manifest;
  const color = manifest.display?.color || '#22c55e';
  const developerMode = useEnvironmentStore((s) => s.developerMode);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'pass' | 'fail'>('idle');
  const [testDetail, setTestDetail] = useState('');

  async function sha256hex(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const runTest = async () => {
    setTesting(true);
    setTestResult('idle');
    setTestDetail('');

    try {
      const challenge = `cosmos-logos-test:${Date.now()}:${crypto.randomUUID()}`;
      const localHash = await sha256hex(challenge);

      const keypair = await loadOrGenerateKeypair();
      const sealed = await sealToken(challenge, manifest.cryptography.public_key);

      const body = JSON.stringify({ envelope: sealed });
      const { signature, timestamp } = await signRequest(body, keypair.privateKey);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        [manifest.cryptography.signing_header]: signature,
        [manifest.cryptography.timestamp_header]: timestamp,
      };

      const resp = await fetch(`${agent.url}/api/cosmos/verify-envelope`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });

      const result = await resp.json();

      if (result.proof_hash && result.proof_hash === localHash) {
        setTestResult('pass');
        setTestDetail(`Hash verified — ${manifest.identity.name} proved it holds the private key`);
      } else {
        setTestResult('fail');
        setTestDetail(result.error || 'Hash mismatch — agent could not decrypt the challenge');
      }
    } catch (e: any) {
      setTestResult('fail');
      setTestDetail(e.message || 'Request failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-surface-1 border border-border-muted rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 font-bold"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {manifest.identity.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{manifest.identity.name}</span>
            <span className="text-2xs text-text-muted font-mono">{manifest.identity.codename}</span>
            <span
              className="text-2xs font-medium px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${color}20`, color }}
            >
              v{manifest.identity.version}
            </span>
          </div>
          <p className="text-2xs text-text-muted mt-0.5 truncate">
            {manifest.identity.purpose || manifest.identity.description || ''}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="text-2xs font-medium px-1.5 py-0.5 bg-surface-3 rounded-full text-text-muted"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Security test button — developer mode only */}
          {developerMode && (
            <button
              onClick={runTest}
              disabled={testing}
              className={`p-1.5 rounded-md transition-colors ${
                testResult === 'pass'
                  ? 'text-green-400 bg-green-500/10'
                  : testResult === 'fail'
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-text-muted hover:text-shell-400 hover:bg-shell-500/10'
              }`}
              title="Test secure messaging"
            >
              {testing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : testResult === 'pass' ? (
                <CheckCircle size={14} />
              ) : testResult === 'fail' ? (
                <XCircle size={14} />
              ) : (
                <Shield size={14} />
              )}
            </button>
          )}
          {manifest.display?.homepage && (
            <a
              href={manifest.display.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors"
              title="View source"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            onClick={onDisconnect}
            className="p-1.5 rounded-md text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Disconnect agent"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Test result inline */}
      {testResult !== 'idle' && (
        <div className={`px-3 py-2 border-t text-xs flex items-center gap-2 ${
          testResult === 'pass'
            ? 'border-green-500/20 bg-green-500/5 text-green-400'
            : 'border-red-500/20 bg-red-500/5 text-red-400'
        }`}>
          {testResult === 'pass' ? <CheckCircle size={12} /> : <XCircle size={12} />}
          <span>{testDetail}</span>
        </div>
      )}
    </div>
  );
}
