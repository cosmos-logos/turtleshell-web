// src/components/settings/AddAgentModal.tsx
//
// Add-an-agent flow. Steward directive 2026-07-09: the unit of trust is
// the agent, identified by its cosmos-logos manifest. Adding an agent is
// the primitive that unlocks "as many agents as we want" — each with
// independent sovereign credentials because the crypto anchor is the
// agent's Ed25519 pubkey.
//
// Flow:
//   1. User pastes the URL of a cosmos-logos.json manifest.
//   2. We fetch it and validate the essential fields (identity.codename,
//      cryptography.public_key, capabilities).
//   3. Show the parsed identity + declared capabilities (chat / voice /
//      x-mcp-tools). User confirms.
//   4. addAgent() registers it in the cosmos-logos store. Its pubkey
//      fingerprint becomes the storage-key scope for any sovereign
//      credentials the user seals for it.
//
// The full cosmos-logos handshake (crypto_box_seal → agent decrypts →
// returns proof hash) is available separately as a Test button once the
// agent is added — mirrors what SealedEnvelopeDemo already does.
//
// For fresh cosmos-logos URLs the URL points at a `${base}/.well-known/
// cosmos-logos.json`; we strip the well-known suffix off to derive the
// `base` URL that gets stored on the agent record (`url` in the store,
// which then plugs into wire callers as the manifest anchor).

import { useState } from 'react';
import { CheckCircle, ClipboardPaste, Compass, Key, Loader2, Lock, Plus, ShieldCheck, X, XCircle, Zap } from 'lucide-react';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { useConfiguredGuidesStore } from '@/lib/store/configured-guides-store';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { useSovereignAiStore } from '@/lib/store/sovereign-ai-store';
import { CHAT_PROVIDERS } from '@/lib/sovereign-ai/provider-catalog';
import { sealForStorage } from '@/lib/sovereign-ai/envelope';
import { saveSlot } from '@/lib/sovereign-ai/secure-storage';
import type { CosmosLogosManifest } from '@/lib/cosmos-logos/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the new agent's ID after successful add. Caller can use
   *  it to auto-open the AgentSettingsSheet for immediate config. */
  onAdded?: (agentId: string) => void;
}

type VerifyState =
  | { kind: 'idle' }
  | { kind: 'fetching' }
  | { kind: 'verified'; manifest: CosmosLogosManifest; baseUrl: string }
  | { kind: 'error'; message: string };

/** Common shape of an inspection step — mirrors ProviderChooser's ceremony
 *  steps but scoped to the verify-manifest flow. */
interface Step {
  label: string;
  detail?: string;
  ok: boolean;
}

type Tab = 'manifest' | 'byok';

export function AddAgentModal({ open, onClose, onAdded }: Props) {
  const [tab, setTab] = useState<Tab>('manifest');
  const [url, setUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [state, setState] = useState<VerifyState>({ kind: 'idle' });
  const [steps, setSteps] = useState<Step[]>([]);

  // ── BYOK tab state ────────────────────────────────
  const [byokProvider, setByokProvider] = useState<string>('openai');
  const [byokKey, setByokKey] = useState('');
  const [byokEndpoint, setByokEndpoint] = useState('');
  const [byokBusy, setByokBusy] = useState(false);
  const [byokError, setByokError] = useState<string | null>(null);
  const [byokSteps, setByokSteps] = useState<Step[]>([]);

  if (!open) return null;

  const reset = () => {
    setTab('manifest');
    setUrl('');
    setDisplayName('');
    setState({ kind: 'idle' });
    setSteps([]);
    setByokProvider('openai');
    setByokKey('');
    setByokEndpoint('');
    setByokBusy(false);
    setByokError(null);
    setByokSteps([]);
  };

  const close = () => {
    reset();
    onClose();
  };

  /** Fetch + validate a cosmos-logos manifest. Emits step breadcrumbs so
   *  the user can see the check unfold — same trust-through-visibility
   *  pattern SealedEnvelopeDemo uses. */
  const verify = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setState({ kind: 'error', message: 'Enter a cosmos-logos manifest URL' });
      return;
    }
    setState({ kind: 'fetching' });
    setSteps([]);
    const addStep = (s: Step) => setSteps((prev) => [...prev, s]);

    // Normalize: allow user to paste either the manifest URL directly OR
    // the base URL (we append `/.well-known/cosmos-logos.json`).
    let manifestUrl = trimmed;
    if (!manifestUrl.includes('/.well-known/')) {
      manifestUrl = manifestUrl.replace(/\/$/, '') + '/.well-known/cosmos-logos.json';
    }
    const baseUrl = manifestUrl.replace(/\/\.well-known\/cosmos-logos\.json\/?$/, '');

    try {
      addStep({ label: `Fetching ${manifestUrl}`, ok: true });
      const resp = await fetch(manifestUrl, { cache: 'no-cache' });
      if (!resp.ok) {
        addStep({ label: `HTTP ${resp.status} — manifest unreachable`, ok: false });
        setState({ kind: 'error', message: `HTTP ${resp.status}` });
        return;
      }
      const manifest = (await resp.json()) as CosmosLogosManifest;

      // Essential-field validation.
      const codename = manifest?.identity?.codename;
      const name = manifest?.identity?.name;
      const pem = manifest?.cryptography?.public_key;
      const caps = manifest?.capabilities;

      if (!codename) {
        addStep({ label: 'Missing identity.codename', ok: false });
        setState({ kind: 'error', message: 'Not a valid cosmos-logos manifest — no identity.codename' });
        return;
      }
      if (!pem) {
        addStep({ label: 'Missing cryptography.public_key', ok: false });
        setState({ kind: 'error', message: 'Not a valid cosmos-logos manifest — no Ed25519 pubkey' });
        return;
      }
      addStep({
        label: `Identity: ${name ?? codename}`,
        detail: `codename: ${codename}${manifest.display?.homepage ? '\nhomepage: ' + manifest.display.homepage : ''}`,
        ok: true,
      });
      addStep({
        label: `Ed25519 public key present`,
        detail: pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '').slice(0, 88) + '…',
        ok: true,
      });
      const verbs = (caps ?? []).map((c) => c.verb).join(', ') || '(none declared)';
      addStep({
        label: `Capabilities: ${verbs}`,
        ok: true,
      });

      // Prefill the display name from the manifest if user hasn't typed
      // one yet.
      if (!displayName.trim() && name) {
        setDisplayName(name);
      }

      setState({ kind: 'verified', manifest, baseUrl });
    } catch (err) {
      const msg = (err as Error).message;
      addStep({ label: `Fetch failed: ${msg}`, ok: false });
      setState({ kind: 'error', message: msg });
    }
  };

  const commit = () => {
    if (state.kind !== 'verified') return;
    const finalName = displayName.trim() || state.manifest.identity.name || state.manifest.identity.codename;
    const store = useCosmosLogosStore.getState();
    const idsBefore = new Set(store.agents.map((a) => a.id));
    store.addAgent(state.baseUrl, state.manifest, finalName, 'custom');
    const newAgent = useCosmosLogosStore
      .getState()
      .agents.find((a) => !idsBefore.has(a.id));
    if (newAgent && onAdded) onAdded(newAgent.id);
    reset();
    onClose();
  };

  /** BYOK path: seal the key against the CURRENT cluster's Athena and
   *  mark the provider as a configured guide. The "agent" from the user's
   *  perspective is a named entry pinning a specific chatProvider on top
   *  of the current Athena's silo. Cryptographically it's the same trust
   *  anchor as any other slot in that Athena — different named guides
   *  pointing at the same silo, each with a different provider selection. */
  const commitByok = async () => {
    setByokError(null);
    setByokSteps([]);
    const addStep = (s: Step) => setByokSteps((prev) => [...prev, s]);

    const providerRow = CHAT_PROVIDERS.find((p) => p.key === byokProvider);
    if (!providerRow) {
      setByokError('Unknown provider');
      return;
    }
    if (providerRow.requiresKey && !byokKey.trim()) {
      setByokError('Paste your API key first');
      return;
    }
    if (providerRow.requiresEndpoint && !byokEndpoint.trim()) {
      setByokError('Enter an endpoint URL');
      return;
    }

    setByokBusy(true);
    try {
      // Resolve the current cluster's Athena manifest URL.
      const envStore = useEnvironmentStore.getState();
      const athenaBase = envStore.getAthenaUrl();
      const manifestUrl = athenaBase.startsWith('http')
        ? `${athenaBase}/.well-known/cosmos-logos.json`
        : `${window.location.origin}${athenaBase}/.well-known/cosmos-logos.json`;

      addStep({ label: `Fetching Athena manifest`, detail: manifestUrl, ok: true });
      addStep({
        label: `Sealing your ${providerRow.displayName} key against Athena's Ed25519 pubkey`,
        detail: 'crypto_box_seal — ephemeral sender keypair. Even this browser will not decrypt it again.',
        ok: true,
      });
      const sealed = await sealForStorage(manifestUrl, {
        provider: providerRow.key,
        key: providerRow.requiresKey ? byokKey.trim() : null,
        endpoint: providerRow.requiresEndpoint ? byokEndpoint.trim() : null,
        model: providerRow.defaultModel,
      });
      addStep({
        label: 'Sealed',
        detail: `stored inner ${sealed.storedInner.length} bytes · god: ${sealed.godRecipient} · fp: sha256:${sealed.pubkeyFingerprint.slice(0, 16)}…`,
        ok: true,
      });

      await saveSlot({
        godFp: sealed.pubkeyFingerprint,
        category: 'chat',
        provider: providerRow.key,
        storedInner: sealed.storedInner,
        manifestFingerprint: sealed.manifestFingerprint,
        godRecipient: sealed.godRecipient,
      });
      addStep({ label: 'Saved to IndexedDB', ok: true });

      // Mirror the slot into the sovereign-ai-store so the picker chip
      // reflects "saved" state immediately (matches the ProviderChooser
      // save path). Also mark the provider as a configured guide so it
      // appears in the sidebar / guide list, and flip chatProvider to it.
      const sai = useSovereignAiStore.getState();
      sai.markChatSlotSaved(sealed.pubkeyFingerprint, providerRow.key, {
        savedAt: new Date().toISOString(),
        godRecipient: sealed.godRecipient,
        fingerprintShort: sealed.manifestFingerprint.replace(/^sha256:/, '').slice(0, 12),
      });
      if (providerRow.requiresEndpoint) {
        sai.setChatEndpoint(providerRow.key, byokEndpoint.trim());
      }
      sai.setChatProvider(providerRow.key);

      // configured-guides-store uses guide keys 'openai' | 'claude' | 'grok' | 'gemini'.
      // Provider catalog uses 'anthropic' (the wire name); map for the guide store.
      const guideKey = providerRow.key === 'anthropic' ? 'claude' : providerRow.key;
      useConfiguredGuidesStore.getState().markConfigured(guideKey);

      addStep({ label: `${providerRow.displayName} configured as an active agent`, ok: true });
      reset();
      onClose();
    } catch (err) {
      const msg = (err as Error).message;
      setByokError(msg);
      addStep({ label: 'Seal failed', detail: msg, ok: false });
    } finally {
      setByokBusy(false);
    }
  };

  const handlePasteKey = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) setByokKey(text);
    } catch { /* clipboard denied */ }
  };

  const handlePasteEndpoint = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) setByokEndpoint(text);
    } catch { /* clipboard denied */ }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
         onClick={close}>
      <div className="w-full max-w-lg bg-surface-1 border border-shell-500/40 rounded-2xl shadow-2xl overflow-hidden"
           onClick={(e) => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-border-muted flex items-center gap-3">
          <Compass size={18} className="text-shell-400" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-shell-300">Add another agent</h2>
            <div className="text-2xs text-text-muted mt-0.5">
              Paste the cosmos-logos manifest URL of the agent you want to add.
              Its pubkey becomes the crypto boundary for any credentials you
              seal to it.
            </div>
          </div>
          <button
            onClick={close}
            className="text-text-muted hover:text-text-primary p-1"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tab switcher — Steward 2026-07-09: two paths for adding an
              agent. (1) Full cosmos-logos manifest for a distinct trust
              anchor; (2) BYOK a provider that gets sealed to the current
              cluster's Athena — a named guide pinning a chat provider on
              the existing silo. */}
          <div className="flex gap-1 bg-surface-2 p-1 rounded-lg">
            <button
              onClick={() => setTab('manifest')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tab === 'manifest'
                  ? 'bg-shell-500 text-black'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Compass size={12} /> Cosmos-logos URL
            </button>
            <button
              onClick={() => setTab('byok')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tab === 'byok'
                  ? 'bg-shell-500 text-black'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Key size={12} /> Bring your own key
            </button>
          </div>

          {/* ── BYOK tab ──────────────────────────────── */}
          {tab === 'byok' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {CHAT_PROVIDERS.filter((p) => p.key !== 'olympus-grid').map((p) => {
                    const sel = byokProvider === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setByokProvider(p.key)}
                        className={`p-3 rounded-lg border-2 transition-colors text-left ${
                          sel
                            ? 'border-shell-500 bg-shell-500/5'
                            : 'border-border-muted bg-surface-2/40 hover:border-shell-500/30'
                        }`}
                      >
                        <div className={`text-sm font-semibold ${sel ? 'text-shell-300' : 'text-text-primary'}`}>
                          {p.displayName}
                        </div>
                        <div className="text-2xs text-text-muted mt-0.5">{p.tagline}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(() => {
                const providerRow = CHAT_PROVIDERS.find((p) => p.key === byokProvider);
                if (!providerRow) return null;
                return (
                  <>
                    {providerRow.requiresKey && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-secondary">API key</label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={byokKey}
                            onChange={(e) => setByokKey(e.target.value)}
                            placeholder={
                              byokProvider === 'openai' ? 'sk-…'
                              : byokProvider === 'anthropic' ? 'sk-ant-…'
                              : byokProvider === 'grok' ? 'xai-…'
                              : byokProvider === 'gemini' ? 'AI…'
                              : ''
                            }
                            className="flex-1 bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 font-mono"
                          />
                          <button
                            onClick={() => void handlePasteKey()}
                            className="px-3 py-2 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <ClipboardPaste size={14} /> Paste
                          </button>
                        </div>
                      </div>
                    )}
                    {providerRow.requiresEndpoint && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-text-secondary">Endpoint URL</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={byokEndpoint || providerRow.defaultEndpointUrl || ''}
                            onChange={(e) => setByokEndpoint(e.target.value)}
                            placeholder={providerRow.defaultEndpointUrl ?? 'http://localhost:PORT'}
                            className="flex-1 bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 font-mono"
                          />
                          <button
                            onClick={() => void handlePasteEndpoint()}
                            className="px-3 py-2 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <ClipboardPaste size={14} /> Paste
                          </button>
                        </div>
                        <div className="text-2xs text-text-muted">
                          ⓘ This is the URL Athena will call, not this browser.
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {byokSteps.length > 0 && (
                <div className="p-3 rounded-lg bg-surface-2/60 border border-border-muted space-y-2">
                  {byokSteps.map((s, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div className="mt-0.5">
                        {s.ok ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-semibold ${s.ok ? 'text-text-secondary' : 'text-red-400'}`}>
                          {s.label}
                        </div>
                        {s.detail && (
                          <div className="text-2xs mt-0.5 whitespace-pre-wrap break-all text-text-muted font-mono bg-surface-2 rounded px-2 py-1 border border-border-muted">
                            {s.detail}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {byokError && (
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/30 text-2xs text-red-400">
                  {byokError}
                </div>
              )}

              <div className="p-3 rounded-lg bg-shell-500/5 border border-shell-500/30 flex items-start gap-2.5">
                <ShieldCheck size={14} className="text-shell-500 mt-0.5 flex-shrink-0" />
                <div className="text-2xs text-text-muted">
                  Your key will be sealed against your currently-selected Athena's
                  Ed25519 pubkey. Only that Athena can decrypt it, and only for
                  one request at a time. If Athena's key rotates, this saved
                  key stops working and you'll be asked to re-enter.
                </div>
              </div>

              <button
                onClick={() => void commitByok()}
                disabled={byokBusy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-black hover:bg-shell-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {byokBusy
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Lock size={14} />}
                {byokBusy ? 'Sealing…' : 'Seal & add'}
              </button>
            </>
          )}

          {/* ── Manifest URL tab (existing flow) ────────── */}
          {tab === 'manifest' && (
            <>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              cosmos-logos manifest URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (state.kind !== 'idle') { setState({ kind: 'idle' }); setSteps([]); }
                }}
                placeholder="https://agent.example.com/.well-known/cosmos-logos.json"
                className="flex-1 bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 font-mono"
              />
              <button
                onClick={() => void verify()}
                disabled={state.kind === 'fetching' || url.trim().length === 0}
                className="px-4 py-2 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {state.kind === 'fetching'
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Zap size={14} />}
                Verify
              </button>
            </div>
            <div className="text-2xs text-text-muted">
              Both the direct manifest URL and the agent's base URL work — we'll
              append <span className="font-mono">/.well-known/cosmos-logos.json</span> if you paste the base.
            </div>
          </div>

          {/* Step trail */}
          {steps.length > 0 && (
            <div className="p-3 rounded-lg bg-surface-2/60 border border-border-muted space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="mt-0.5">
                    {s.ok ? <CheckCircle size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-semibold ${s.ok ? 'text-text-secondary' : 'text-red-400'}`}>
                      {s.label}
                    </div>
                    {s.detail && (
                      <div className="text-2xs mt-0.5 whitespace-pre-wrap break-all text-text-muted font-mono bg-surface-2 rounded px-2 py-1 border border-border-muted">
                        {s.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verified — show name field + commit button */}
          {state.kind === 'verified' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">
                  Name in your sidebar
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={state.manifest.identity.name ?? state.manifest.identity.codename}
                  className="w-full bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50"
                />
                <div className="text-2xs text-text-muted">
                  Only affects display. The crypto identity is the manifest's
                  Ed25519 pubkey.
                </div>
              </div>

              <div className="p-3 rounded-lg bg-shell-500/5 border border-shell-500/30 flex items-start gap-2.5">
                <ShieldCheck size={14} className="text-shell-500 mt-0.5 flex-shrink-0" />
                <div className="text-2xs text-text-muted">
                  This agent has its own sovereign silo. Credentials you seal
                  for it can never be opened by any other agent — even one
                  with the same codename running on a different key.
                </div>
              </div>

              <button
                onClick={commit}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-black hover:bg-shell-400 rounded-lg text-sm font-semibold transition-colors"
              >
                <Plus size={14} />
                Add this agent
              </button>
            </>
          )}

          {state.kind === 'error' && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/30 text-2xs text-red-400">
              {state.message}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
