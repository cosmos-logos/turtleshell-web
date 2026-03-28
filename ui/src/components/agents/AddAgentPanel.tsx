import { useState } from 'react';
import { Loader2, Plus, AlertCircle, CheckCircle, Search, Settings2, Shield } from 'lucide-react';
import { fetchManifest, pingAgent, applySetup, resolveManifestUrl } from '@/lib/cosmos-logos/client';
import { sealToken, signRequest, loadOrGenerateKeypair } from '@/lib/cosmos-logos/crypto';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { useAgentStore } from '@/lib/store/agent-store';
import type { CosmosLogosManifest, CosmosLogosSetupField } from '@/lib/cosmos-logos/types';

export function AddAgentPanel() {
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError]         = useState('');
  const [preview, setPreview]     = useState<CosmosLogosManifest | null>(null);
  const [agentUrl, setAgentUrl]   = useState('');
  const [connected, setConnected] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [securityStatus, setSecurityStatus] = useState<'idle' | 'validating' | 'passed' | 'failed'>('idle');
  const [displayName, setDisplayName] = useState('');
  const { addAgent } = useCosmosLogosStore();

  const setupFields = preview?.setup?.fields ?? [];
  const hasSetup    = setupFields.length > 0;
  const requiredFields = setupFields.filter(f => f.required);
  const canConnect  = !requiredFields.some(f => !(fieldValues[f.key] ?? f.default ?? '').trim());

  const inputHint = resolveManifestUrl(input.trim()).isGitHub
    ? 'GitHub repo detected — will fetch manifest and resolve live endpoint'
    : '';

  function initFieldValues(fields: CosmosLogosSetupField[]) {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.key] = f.default ?? '';
    }
    setFieldValues(init);
  }

  const handleFetch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setPreview(null);
    setConnected(false);

    try {
      const { manifest, agentUrl: resolvedUrl } = await fetchManifest(input.trim());

      // For GitHub-sourced manifests we ping the live endpoint from the manifest.
      // For direct URLs we ping the URL the user entered.
      const reachable = await pingAgent(resolvedUrl);
      if (!reachable) {
        setError(
          `Agent not reachable at ${resolvedUrl}. Make sure it is running and accessible.`
        );
        setLoading(false);
        return;
      }

      setAgentUrl(resolvedUrl);
      setPreview(manifest);
      initFieldValues(manifest.setup?.fields ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch manifest');
    } finally {
      setLoading(false);
    }
  };

  async function sha256hex(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleConnect = async () => {
    if (!preview) return;
    setConnecting(true);
    setError('');
    setSecurityStatus('validating');

    try {
      // ── Step 1: Secure messaging validation ──
      // Seal a challenge message with the agent's public key, send it,
      // and verify the agent can decrypt it (proves it holds the private key)
      const challenge = `cosmos-logos-handshake:${Date.now()}:${crypto.randomUUID()}`;
      const localHash = await sha256hex(challenge);

      const keypair = await loadOrGenerateKeypair();
      const sealed = await sealToken(challenge, preview.cryptography.public_key);

      const body = JSON.stringify({ envelope: sealed });
      const { signature, timestamp } = await signRequest(body, keypair.privateKey);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        [preview.cryptography.signing_header]: signature,
        [preview.cryptography.timestamp_header]: timestamp,
      };

      const resp = await fetch(`${agentUrl}/api/cosmos/verify-envelope`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });

      const result = await resp.json();

      if (!result.proof_hash || result.proof_hash !== localHash) {
        setSecurityStatus('failed');
        setError(
          `Security validation failed — ${preview.identity.name} could not prove it holds the private key matching its published public key. ` +
          (result.error ? `(${result.error})` : 'Hash mismatch.')
        );
        setConnecting(false);
        return;
      }

      setSecurityStatus('passed');

      // ── Step 2: Apply setup fields ──
      if (preview.setup && hasSetup) {
        const payload: Record<string, string> = {};
        for (const f of setupFields) {
          payload[f.key] = (fieldValues[f.key] ?? f.default ?? '').trim();
        }
        await applySetup(agentUrl, preview.setup.apply_endpoint, payload);
      }

      // ── Step 3: Register the agent ──
      addAgent(agentUrl, preview, displayName.trim() || undefined);
      useAgentStore.getState().reloadHidden();
      setConnected(true);
      setTimeout(() => {
        setInput('');
        setPreview(null);
        setAgentUrl('');
        setConnected(false);
        setFieldValues({});
        setDisplayName('');
        setSecurityStatus('idle');
      }, 2000);
    } catch (e) {
      setSecurityStatus('failed');
      setError(
        e instanceof Error
          ? `Security validation failed: ${e.message}`
          : 'Failed to connect agent'
      );
    } finally {
      setConnecting(false);
    }
  };

  const color = preview?.display?.color || '#22c55e';

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFetch(); }}
            placeholder="cosmos-logos/thoth  or  http://localhost:3801"
            className="w-full bg-surface-2 border border-border-muted rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 transition-colors"
          />
        </div>
        <button
          onClick={handleFetch}
          disabled={!input.trim() || loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Fetch
        </button>
      </div>

      {inputHint && !preview && (
        <p className="text-2xs text-text-muted pl-1">{inputHint}</p>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-red-400">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {connected && (
        <div className="flex items-center gap-2 p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-xs text-green-400">
          <CheckCircle size={14} className="flex-shrink-0" />
          <span>Agent connected successfully!</span>
        </div>
      )}

      {preview && !connected && (
        <div className="bg-surface-1 border border-border-muted rounded-lg p-4 space-y-3">

          {/* Identity */}
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 font-bold"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {preview.identity.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">{preview.identity.name}</h3>
              <p className="text-2xs text-text-muted">{preview.identity.purpose}</p>
            </div>
          </div>

          {/* Display Name (override) */}
          <div className="space-y-1">
            <label className="text-2xs text-text-muted uppercase tracking-wider font-semibold">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={preview.identity.name}
              className="w-full bg-surface-2 border border-border-muted rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50"
            />
            <p className="text-2xs text-text-muted">
              Optional — rename to distinguish multiple instances (e.g. "Athena AWS", "Athena Off-Grid")
            </p>
          </div>

          {/* Capabilities */}
          <div>
            <span className="text-2xs text-text-muted uppercase tracking-wider font-semibold">
              Capabilities
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {preview.capabilities.map((cap) => (
                <span
                  key={cap.verb}
                  className="text-2xs font-medium px-2 py-0.5 bg-surface-3 rounded-full text-text-secondary"
                >
                  {cap.verb}
                </span>
              ))}
            </div>
          </div>

          {/* Version / crypto / license */}
          <div className="flex items-center gap-3 text-2xs text-text-muted">
            <span>v{preview.identity.version}</span>
            <span>·</span>
            <span>{preview.cryptography.algorithm}</span>
            {preview.metadata?.license && (
              <>
                <span>·</span>
                <span>{preview.metadata.license}</span>
              </>
            )}
          </div>

          {/* Dynamic setup fields */}
          {hasSetup && (
            <div className="border-t border-border-muted pt-3 space-y-3">
              <div className="flex items-center gap-1.5 text-2xs text-text-muted uppercase tracking-wider font-semibold">
                <Settings2 size={12} />
                <span>Setup</span>
              </div>
              {setupFields.map((field) => (
                <div key={field.key}>
                  <label className="text-2xs text-text-muted block mb-1">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <input
                    type={field.type === 'secret' ? 'password' : 'text'}
                    value={fieldValues[field.key] ?? ''}
                    onChange={(e) =>
                      setFieldValues((v) => ({ ...v, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder ?? field.default ?? ''}
                    className="w-full bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 transition-colors font-mono"
                  />
                  {field.description && (
                    <p className="text-2xs text-text-muted mt-1">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Security validation status */}
          {securityStatus === 'validating' && (
            <div className="flex items-center gap-2 p-3 bg-shell-500/5 border border-shell-500/20 rounded-lg text-xs text-shell-400">
              <Loader2 size={14} className="animate-spin" />
              <span>Validating secure messaging — proving agent holds its private key...</span>
            </div>
          )}
          {securityStatus === 'passed' && (
            <div className="flex items-center gap-2 p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-xs text-green-400">
              <Shield size={14} />
              <span>Secure messaging validated — agent proved it holds the correct private key</span>
            </div>
          )}
          {securityStatus === 'failed' && (
            <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-red-400">
              <Shield size={14} />
              <span>Security validation failed — agent cannot be trusted</span>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting || !canConnect}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {connecting ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            {connecting ? 'Validating & connecting...' : `Verify & Connect ${preview.identity.name}`}
          </button>

          {!canConnect && (
            <p className="text-2xs text-text-muted text-center">
              Fill in the required fields above to continue.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
