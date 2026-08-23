// src/components/settings/ProviderChooser.tsx
//
// EOS-5.4 Sovereign AI — Version 2 (no-plaintext-anywhere) Provider Chooser.
//
// Steward directive 2026-07-07:
//   • Keys are NEVER stored plaintext on the client. At paste time we
//     immediately seal against the target god's Ed25519 public key
//     (crypto_box_seal). The client cannot decrypt what it seals; only
//     Athena / Apollo can. The ciphertext is what lives in IndexedDB.
//   • The whole flow is a CEREMONY — visible step-by-step in the UI AND
//     mirrored to console.log with a [SOVEREIGN] prefix. Users can see
//     exactly what is happening; that visibility is the trust primitive.
//   • Test button per slot, continually re-runnable, hits /v1/{god}/byok/test
//     and returns a verdict without exposing the key.
//   • Trash icon only (no "Clear" label), with a confirmation click.
//
// The ceremony pattern is lifted from src/components/dev/SealedEnvelopeDemo.tsx
// where it was first proven — cosmos-logos handshake step visualization is
// the trust primitive we're carrying forward into the mainline flow.

import { useEffect, useMemo, useState } from 'react';
import {
  Eye, EyeOff, ClipboardPaste, Trash2, Check, X, ShieldCheck,
  Lock, Unlock, Hash, PenTool, CheckCircle, XCircle, Send, RefreshCw,
} from 'lucide-react';
import { providersFor, type SovereignCategory, type SovereignProvider } from '@/lib/sovereign-ai/provider-catalog';
import {
  useSovereignAiStore,
  getChatEndpointFor,
  getVoiceEndpointFor,
  hasChatSlot,
  hasVoiceSlot,
} from '@/lib/store/sovereign-ai-store';
import {
  sealForStorage,
  sealForWire,
  fetchManifestForCeremony,
} from '@/lib/sovereign-ai/envelope';
import {
  saveSlot,
  loadSlot,
  deleteSlot,
  listSlots,
  type StoredSlot,
} from '@/lib/sovereign-ai/secure-storage';

interface Props {
  category: SovereignCategory;
  /** Explicit manifest URL for the AGENT whose credentials this chooser
   *  scopes to. Steward 2026-07-09: sovereignty is agent-anchored, not
   *  cluster-anchored. Different agents (different pubkeys) have wholly
   *  independent credential silos. Callers (Settings' per-agent config
   *  panel) MUST provide this so it's clear which agent is being edited. */
  manifestUrl: string;
  /** Human-visible label for the scope banner, e.g. "Athena at Local Dev
   *  Tunnel". If absent, only the manifest identity + fingerprint show. */
  scopeLabel?: string;
  open: boolean;
  onClose: () => void;
}

interface RowDraft {
  key: string;
  endpoint: string;
  reveal: boolean;
}

/** One step in a ceremony (save or test). Same shape SealedEnvelopeDemo uses. */
interface CeremonyStep {
  label: string;
  detail?: string;
  mono?: boolean;
  status: 'info' | 'lock' | 'unlock' | 'hash' | 'sign' | 'send' | 'ok' | 'fail';
}

/** Provider-scoped ceremony state. `steps` are what we render; `busy` gates
 *  buttons; `pendingDelete` is a two-tap confirmation flag for the trash icon. */
interface RowUiState {
  steps: CeremonyStep[];
  busy: boolean;
  pendingDelete: boolean;
}

function exampleKeyFor(providerKey: string): string {
  switch (providerKey) {
    case 'openai':      return 'sk-…';
    case 'anthropic':   return 'sk-ant-…';
    case 'grok':        return 'xai-…';
    case 'gemini':      return 'AI…';
    case 'elevenlabs':  return 'sk_…';
    default:            return '(paste key here)';
  }
}

/**
 * Compact fingerprint display — first / last 4 chars of a raw key. Used
 * only in the "Saved" state confirmation: shows the user that *some* key
 * is stored without letting them (or an XSS observer) reconstruct the key.
 *
 * Note: the raw key isn't reachable in v2 — we never store it. This fn is
 * a placeholder for a future scheme where paste-time computes a hash-only
 * fingerprint into slot metadata; today we render the god fingerprint
 * (which IS non-secret) as the confirmation instead.
 */
function shortFp(fp: string): string {
  // Take the sha256:HEX form, keep 12 chars.
  const trimmed = fp.replace(/^sha256:/, '');
  return trimmed.slice(0, 12);
}

// ─── Per-agent context derived from the caller's manifest URL ───
//
// Steward 2026-07-09: sovereignty is agent-anchored. The chooser no longer
// derives the god from `category` + the current cluster's env store — that
// implicit binding was the design bug. Now the caller (Settings' per-agent
// config panel) passes the agent's manifest URL explicitly, and everything
// else — test-endpoint URL, wire-block field name — is derived from it or
// from the category the chooser was opened in.

function useAgentContext(category: SovereignCategory, manifestUrl: string) {
  return useMemo(() => {
    // Derive the test URL by lopping `/.well-known/cosmos-logos.json` off
    // the manifest URL and appending `/byok/test`. Athena and Apollo both
    // expose `/byok/test` at their base.
    const baseUrl = manifestUrl.replace(/\/\.well-known\/cosmos-logos\.json\/?$/, '');
    return {
      baseUrl,
      manifestUrl,
      testUrl: `${baseUrl}/byok/test`,
      blockFieldName: (category === 'chat' ? 'chatProvider' : 'voiceProvider') as
        | 'chatProvider'
        | 'voiceProvider',
    };
  }, [category, manifestUrl]);
}

// ─── Console breadcrumb helper (Steward's ceremony visibility directive) ───

function logStep(category: SovereignCategory, providerKey: string, msg: string, detail?: unknown) {
  // eslint-disable-next-line no-console
  console.log(
    `%c[SOVEREIGN·${category}·${providerKey}]%c ${msg}`,
    'color: #f4b400; font-weight: bold',
    'color: inherit',
    detail ?? '',
  );
}

/** God identity resolved at chooser-open time. v3 sovereign storage is
 *  scoped to this pubkey fingerprint — every slot op in this modal reads
 *  from and writes to the silo for the current god only. Switching
 *  cluster/agent while the chooser is open would break the scope; the
 *  effect re-fetches on category change and users close+reopen if they
 *  switched cluster. */
interface GodIdentity {
  pubkeyFingerprint: string;
  manifestFingerprint: string;
  godRecipient: string;   // codename (e.g. "athena-616")
  displayName: string;    // manifest identity.name (e.g. "Athena")
}

export function ProviderChooser({ category, manifestUrl, scopeLabel, open, onClose }: Props) {
  const store = useSovereignAiStore();
  const currentProvider = category === 'chat' ? store.chatProvider : store.voiceProvider;
  const setProvider = category === 'chat' ? store.setChatProvider : store.setVoiceProvider;
  const setEndpoint = category === 'chat' ? store.setChatEndpoint : store.setVoiceEndpoint;
  const markSlotSaved = category === 'chat' ? store.markChatSlotSaved : store.markVoiceSlotSaved;
  const clearSlotStore = category === 'chat' ? store.clearChatSlot : store.clearVoiceSlot;
  const recordTest = category === 'chat' ? store.recordChatTestResult : store.recordVoiceTestResult;
  const hasSlotForGod = category === 'chat' ? hasChatSlot : hasVoiceSlot;
  const godCtx = useAgentContext(category, manifestUrl);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [uiState, setUiState] = useState<Record<string, RowUiState>>({});
  /** v3: which god's silo we're editing. Populated by manifest fetch on
   *  open. Until this is set, slot rows show a "resolving trust anchor"
   *  loading state — we can't render "Saved" vs "not saved" without
   *  knowing which godFp to check. */
  const [godInfo, setGodInfo] = useState<GodIdentity | null>(null);
  const [godLoadError, setGodLoadError] = useState<string | null>(null);
  const hasSlot = (providerKey: string): boolean =>
    godInfo ? hasSlotForGod(godInfo.pubkeyFingerprint, providerKey) : false;

  // Draft-seed + IDB-hydrate is split into TWO effects and both depend ONLY
  // on `open` and `category`. Previously the combined effect took
  // `hydrateFromIdb` (useCallback with `store` as a dep) and `getEndpointFor`
  // (local const, new identity every render) as deps — so the effect fired
  // on every store update, and the async hydrate itself triggered a store
  // update. Loop: user pastes → draft state changes → component re-renders
  // → `store` identity churn → `hydrateFromIdb` gets new identity → effect
  // fires → drafts wiped back to seed. Steward: "field briefly flashes then
  // goes blank". Fix: seed drafts ONCE on open (or category change), never
  // re-seed on downstream store activity. Read store getters imperatively
  // inside the effect body so they don't need to be deps.
  useEffect(() => {
    if (!open) return;
    // 1. Seed drafts. Key stays EMPTY (we never re-expose plaintext).
    //    Endpoint seeds from non-secret store value (Ollama URL, XTTS URL —
    //    those are addresses, not secrets).
    const readEndpointFor = category === 'chat' ? getChatEndpointFor : getVoiceEndpointFor;
    const seed: Record<string, RowDraft> = {};
    const uiSeed: Record<string, RowUiState> = {};
    for (const p of providersFor(category)) {
      seed[p.key] = {
        key: '',
        endpoint: readEndpointFor(p.key) ?? (p.requiresEndpoint ? (p.defaultEndpointUrl ?? '') : ''),
        reveal: false,
      };
      uiSeed[p.key] = { steps: [], busy: false, pendingDelete: false };
    }
    setDrafts(seed);
    setUiState(uiSeed);
    setGodInfo(null);
    setGodLoadError(null);
    // 2. Resolve the god identity (v3 storage scope), then hydrate that
    //    god's slot metadata into the store. Inline — no useCallback, no
    //    `store` dep, no feedback loop.
    (async () => {
      try {
        const manifest = await fetchManifestForCeremony(godCtx.manifestUrl);
        const identity: GodIdentity = {
          pubkeyFingerprint: manifest.pubkeyFingerprint,
          manifestFingerprint: manifest.fingerprint,
          godRecipient: manifest.godRecipient,
          // Prefer manifest.identity.name (e.g. "Athena"), fall back to
          // codename (e.g. "athena-616"), then to the scopeLabel the caller
          // passed us as ultimate fallback.
          displayName: manifest.identity.name || manifest.godRecipient || scopeLabel || 'the agent',
        };
        setGodInfo(identity);
        logStep(category, '_', 'trust anchor resolved', {
          codename: identity.godRecipient,
          pubkeyFp: identity.pubkeyFingerprint.slice(0, 16),
        });
        const slots = await listSlots(identity.pubkeyFingerprint, category);
        const info: Record<string, { savedAt: string; godRecipient: string; fingerprintShort: string }> = {};
        for (const s of slots) {
          info[s.provider] = {
            savedAt: s.savedAt,
            godRecipient: s.godRecipient,
            fingerprintShort: shortFp(s.manifestFingerprint),
          };
        }
        const storeSnap = useSovereignAiStore.getState();
        if (category === 'chat') storeSnap.hydrateChatSlots(identity.pubkeyFingerprint, info);
        else storeSnap.hydrateVoiceSlots(identity.pubkeyFingerprint, info);
      } catch (err) {
        const msg = (err as Error).message;
        setGodLoadError(msg);
        logStep(category, '_', 'trust anchor resolution failed', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  if (!open) return null;

  const patchDraft = (providerKey: string, patch: Partial<RowDraft>) => {
    setDrafts((d) => ({ ...d, [providerKey]: { ...d[providerKey]!, ...patch } }));
  };
  const patchUi = (providerKey: string, patch: Partial<RowUiState>) => {
    setUiState((u) => ({ ...u, [providerKey]: { ...u[providerKey]!, ...patch } }));
  };
  const addStep = (providerKey: string, step: CeremonyStep) => {
    setUiState((u) => ({
      ...u,
      [providerKey]: {
        ...u[providerKey]!,
        steps: [...(u[providerKey]?.steps ?? []), step],
      },
    }));
  };
  const resetSteps = (providerKey: string) => {
    setUiState((u) => ({
      ...u,
      [providerKey]: { ...u[providerKey]!, steps: [] },
    }));
  };

  // ─── Actions ───

  const handlePaste = async (providerKey: string, field: 'key' | 'endpoint') => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) return;
      patchDraft(providerKey, { [field]: text } as Partial<RowDraft>);
      logStep(category, providerKey, `pasted ${field}`, {
        length: text.length,
        head: field === 'key' ? text.slice(0, 4) + '…' : text,
      });
    } catch (err) {
      logStep(category, providerKey, 'clipboard read denied', err);
    }
  };

  /** THE SEAL CEREMONY — paste time. Runs when user hits "Save & Seal". */
  const handleSaveAndSeal = async (p: SovereignProvider) => {
    const draft = drafts[p.key];
    if (!draft) return;
    const providerKey = p.key;
    const key = p.requiresKey ? draft.key.trim() : null;
    const endpoint = p.requiresEndpoint ? draft.endpoint.trim() : null;

    if (p.requiresKey && !key) {
      logStep(category, providerKey, 'save aborted: key missing');
      return;
    }
    if (p.requiresEndpoint && !endpoint) {
      logStep(category, providerKey, 'save aborted: endpoint missing');
      return;
    }

    patchUi(providerKey, { busy: true });
    resetSteps(providerKey);

    // Persist the (non-secret) endpoint into the store — Ollama URL etc.
    if (p.requiresEndpoint && endpoint) {
      setEndpoint(p.key, endpoint);
    }

    try {
      addStep(providerKey, { label: '1. Fetching cosmos-logos manifest', detail: godCtx.manifestUrl, status: 'send', mono: true });
      logStep(category, providerKey, 'fetching manifest', godCtx.manifestUrl);

      const manifest = await fetchManifestForCeremony(godCtx.manifestUrl);
      addStep(providerKey, {
        label: `2. ${(godInfo?.displayName ?? 'the agent')} identity attested`,
        detail: `codename: ${manifest.identity.codename}\nfingerprint: sha256:${shortFp(manifest.fingerprint)}…`,
        status: 'ok',
        mono: true,
      });
      addStep(providerKey, {
        label: `3. ${(godInfo?.displayName ?? 'the agent')}'s Ed25519 public key (recipient)`,
        detail: manifest.pemPubkey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '').slice(0, 88) + '…',
        status: 'hash',
        mono: true,
      });
      logStep(category, providerKey, 'manifest OK', {
        god: manifest.godRecipient,
        fp: manifest.fingerprint,
      });

      addStep(providerKey, {
        label: '4. Sealing your key against that public key',
        detail: 'crypto_box_seal (libsodium NaCl). Ephemeral sender keypair — even THIS browser will never decrypt what it just sealed.',
        status: 'lock',
      });

      // ── The seal itself. Plaintext key exists only in the closure of
      // this call; after sealForStorage returns, we drop it. Steward's
      // "no plaintext at rest" property depends on us NOT stashing `key`
      // anywhere else — draft.key is cleared right after.
      const sealed = await sealForStorage(godCtx.manifestUrl, {
        provider: p.key,
        key,
        endpoint,
        model: p.defaultModel,
      });

      addStep(providerKey, {
        label: '5. Sealed ciphertext',
        detail: sealed.storedInner.slice(0, 60) + '… (' + sealed.storedInner.length + ' bytes base64)',
        status: 'lock',
        mono: true,
      });
      logStep(category, providerKey, 'sealed', {
        bytes: sealed.storedInner.length,
        fp: sealed.manifestFingerprint,
      });

      addStep(providerKey, { label: '6. Storing sealed bytes in IndexedDB', status: 'send' });
      // v3: slot is keyed by the god's pubkey fingerprint. sealForStorage
      // returns it alongside the ciphertext — use that same fp for both the
      // IDB write and the store's mirror. Guarantees storage-time consistency
      // even if godInfo state hasn't hydrated yet (edge case: user pastes
      // very fast after opening the chooser).
      await saveSlot({
        godFp: sealed.pubkeyFingerprint,
        category,
        provider: p.key,
        storedInner: sealed.storedInner,
        manifestFingerprint: sealed.manifestFingerprint,
        godRecipient: sealed.godRecipient,
      });
      markSlotSaved(sealed.pubkeyFingerprint, p.key, {
        savedAt: new Date().toISOString(),
        godRecipient: sealed.godRecipient,
        fingerprintShort: shortFp(sealed.manifestFingerprint),
      });
      logStep(category, providerKey, 'IndexedDB saved', {
        godFp: sealed.pubkeyFingerprint.slice(0, 16),
      });

      // Clear the plaintext draft immediately — no matter how briefly the
      // input holds it, once sealed it should be gone from the UI too.
      patchDraft(providerKey, { key: '', reveal: false });

      addStep(providerKey, {
        label: '7. Your key is sealed and stored',
        detail: `${(godInfo?.displayName ?? 'the agent')} is the only party that can ever open it. If ${(godInfo?.displayName ?? 'the agent')}'s key rotates, this stored ciphertext becomes unreadable and you will be asked to re-enter — that IS the security posture.`,
        status: 'ok',
      });

      // Auto-run the test flow after save so the user immediately sees
      // whether the key works. Ceremony continues (we append test steps
      // onto the same panel).
      await handleTestInternal(p);
    } catch (err) {
      const msg = (err as Error).message;
      addStep(providerKey, { label: 'Save failed', detail: msg, status: 'fail' });
      logStep(category, providerKey, 'save failed', err);
    } finally {
      patchUi(providerKey, { busy: false });
    }
  };

  /** THE TEST CEREMONY — cosmos-logos handshake + provider validation.
   *  Runs when user hits "Test" on a saved slot (or auto after save). */
  const handleTest = async (p: SovereignProvider) => {
    resetSteps(p.key);
    patchUi(p.key, { busy: true });
    try {
      await handleTestInternal(p);
    } finally {
      patchUi(p.key, { busy: false });
    }
  };

  const handleTestInternal = async (p: SovereignProvider) => {
    const providerKey = p.key;
    try {
      addStep(providerKey, { label: 'Test flow starting', status: 'info' });
      logStep(category, providerKey, 'test starting');

      if (!godInfo) {
        addStep(providerKey, {
          label: 'Trust anchor not resolved yet',
          detail: godLoadError ?? 'still fetching the god manifest',
          status: 'fail',
        });
        return;
      }
      const slot = await loadSlot(godInfo.pubkeyFingerprint, category, p.key);
      if (!slot) {
        addStep(providerKey, {
          label: 'No sealed key in IndexedDB for this agent',
          detail: `Enter your key and hit Save & Seal first. Scope: ${godInfo.displayName} (${godInfo.pubkeyFingerprint.slice(0, 16)}…)`,
          status: 'fail',
        });
        logStep(category, providerKey, 'test aborted: no slot');
        return;
      }

      addStep(providerKey, {
        label: 'Loaded sealed inner from storage',
        detail: `saved ${slot.savedAt}\nrecipient: ${slot.godRecipient}\nfingerprint at seal: sha256:${shortFp(slot.manifestFingerprint)}…`,
        status: 'unlock',
        mono: true,
      });

      addStep(providerKey, {
        label: 'Fetching cosmos-logos manifest (current)',
        detail: godCtx.manifestUrl,
        status: 'send',
        mono: true,
      });
      const manifest = await fetchManifestForCeremony(godCtx.manifestUrl);
      const rotated = manifest.fingerprint !== slot.manifestFingerprint;
      if (rotated) {
        addStep(providerKey, {
          label: 'Rotation detected — stored key can no longer be decrypted',
          detail: `saved fingerprint: sha256:${shortFp(slot.manifestFingerprint)}…\ncurrent fingerprint: sha256:${shortFp(manifest.fingerprint)}…`,
          status: 'fail',
          mono: true,
        });
        logStep(category, providerKey, 'rotation detected on test', {
          storedFp: slot.manifestFingerprint,
          currentFp: manifest.fingerprint,
        });
        // Proactive wipe — server would tell us anyway, but no need to burn
        // a network round trip when we can see the rotation locally.
        try { await deleteSlot(godInfo.pubkeyFingerprint, category, p.key); } catch { /* ignore */ }
        clearSlotStore(godInfo.pubkeyFingerprint, p.key);
        recordTest(godInfo.pubkeyFingerprint, p.key, {
          ok: false,
          testedAt: new Date().toISOString(),
          error: 'cosmos-logos key rotated — key wiped, re-enter',
        });
        return;
      }
      addStep(providerKey, { label: 'Manifest fingerprint matches storage', status: 'ok' });

      addStep(providerKey, {
        label: 'Wrapping storedInner in fresh outer envelope',
        detail: 'nonce (random 16 bytes) + issuedAt (now) + clientSurface + fingerprint',
        status: 'sign',
      });
      const wire = await sealForWire(godCtx.manifestUrl, slot.storedInner, 'turtleshell-web');

      addStep(providerKey, {
        label: `Sending sealed test envelope to ${(godInfo?.displayName ?? 'the agent')}`,
        detail: `POST ${godCtx.testUrl}`,
        status: 'send',
        mono: true,
      });

      const ogToken = localStorage.getItem('og_access_token');
      const testStart = Date.now();
      const resp = await fetch(godCtx.testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ogToken ? { 'x-user-identity': ogToken } : {}),
        },
        body: JSON.stringify({
          sovereignAI: {
            [godCtx.blockFieldName]: p.key,
            sealedEnvelope: wire.sealedEnvelopeBase64,
            envelopeFormat: wire.envelopeFormat,
            envelopeVersion: wire.envelopeVersion,
            manifestUrl: wire.manifestUrl,
          },
        }),
      });

      const verdict: any = await resp.json().catch(() => ({}));
      const took = Date.now() - testStart;
      logStep(category, providerKey, 'test verdict', verdict);

      if (!resp.ok || verdict.ok === false) {
        // envelope_storage_stale from the server = same kill-switch as
        // proactive detection above; wipe and prompt re-entry.
        if (verdict.errorCode === 'envelope_storage_stale') {
          try { await deleteSlot(godInfo.pubkeyFingerprint, category, p.key); } catch { /* ignore */ }
          clearSlotStore(godInfo.pubkeyFingerprint, p.key);
        }
        addStep(providerKey, {
          label: `${p.displayName} rejected the key`,
          detail: verdict.error || `HTTP ${resp.status}`,
          status: 'fail',
        });
        recordTest(godInfo.pubkeyFingerprint, p.key, {
          ok: false,
          testedAt: new Date().toISOString(),
          tookMs: took,
          error: verdict.error || `HTTP ${resp.status}`,
        });
        return;
      }

      addStep(providerKey, {
        label: `${(godInfo?.displayName ?? 'the agent')} decrypted the envelope privately`,
        detail: `The stored ciphertext was opened server-side. Timing: ${verdict.tookMs ?? took}ms.`,
        status: 'unlock',
      });
      if (typeof verdict.modelCount === 'number') {
        addStep(providerKey, {
          label: `${p.displayName} confirmed ${verdict.modelCount} models available`,
          status: 'hash',
        });
      }
      addStep(providerKey, {
        label: 'Key is valid',
        detail: `endpoint class: ${verdict.endpointClass ?? 'managed-cloud'}. You can chat / speak against this provider now.`,
        status: 'ok',
      });
      recordTest(godInfo.pubkeyFingerprint, p.key, {
        ok: true,
        testedAt: new Date().toISOString(),
        tookMs: took,
      });
    } catch (err) {
      const msg = (err as Error).message;
      addStep(providerKey, { label: 'Test flow error', detail: msg, status: 'fail' });
      logStep(category, providerKey, 'test error', err);
    }
  };

  const handleDeleteInitiate = (p: SovereignProvider) => {
    patchUi(p.key, { pendingDelete: true });
    logStep(category, p.key, 'delete initiated — awaiting confirmation');
  };

  const handleDeleteConfirm = async (p: SovereignProvider) => {
    try {
      if (!godInfo) throw new Error('trust anchor not resolved');
      await deleteSlot(godInfo.pubkeyFingerprint, category, p.key);
      clearSlotStore(godInfo.pubkeyFingerprint, p.key);
      resetSteps(p.key);
      logStep(category, p.key, 'slot deleted from IndexedDB and store', {
        godFp: godInfo.pubkeyFingerprint.slice(0, 16),
      });
    } catch (err) {
      logStep(category, p.key, 'delete failed', err);
    } finally {
      patchUi(p.key, { pendingDelete: false });
    }
  };

  const handleDeleteCancel = (p: SovereignProvider) => {
    patchUi(p.key, { pendingDelete: false });
    logStep(category, p.key, 'delete cancelled');
  };

  const handleChoose = (p: SovereignProvider) => {
    setProvider(p.key);
    logStep(category, p.key, `chosen as active ${category} provider`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-1 border border-shell-500/40 rounded-2xl shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface-1 border-b border-border-muted px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-shell-400 hover:text-shell-300 text-sm">
              ‹ Back
            </button>
            <h2 className="flex-1 text-center text-lg font-semibold text-shell-300">
              {category === 'chat' ? 'Chat AI' : 'Voice AI'}
            </h2>
            <div className="w-14" />
          </div>
          {/* v3 scope banner — makes it visible which agent this credential
              silo is scoped to. Two Athenas with different pubkeys are
              cryptographically distinct sovereign silos. Steward 2026-07-09. */}
          <div className="mt-2 flex items-center justify-center gap-1.5 text-2xs">
            {godInfo ? (
              <>
                <ShieldCheck size={12} className="text-shell-500" />
                <span className="text-text-muted">
                  Editing for <span className="text-shell-300 font-semibold">
                    {scopeLabel ?? godInfo.displayName}
                  </span>
                </span>
                <span className="text-text-muted/60 font-mono">
                  · sha256:{godInfo.pubkeyFingerprint.slice(0, 12)}…
                </span>
              </>
            ) : godLoadError ? (
              <span className="text-red-400">
                Trust anchor fetch failed: {godLoadError.slice(0, 60)}
              </span>
            ) : (
              <span className="text-text-muted italic">Resolving trust anchor…</span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-text-secondary">
            {category === 'chat'
              ? 'Pick who thinks for your Guardian. You can change this any time.'
              : 'Pick who speaks for your Guardian. You can change this any time.'}
          </p>

          {providersFor(category).map((p) => {
            const draft = drafts[p.key];
            const ui = uiState[p.key];
            if (!draft || !ui) return null;
            const isCurrent = currentProvider === p.key;
            const slotPresent = hasSlot(p.key);
            const slotInfo = godInfo
              ? (category === 'chat'
                  ? store.chatSlotInfo[godInfo.pubkeyFingerprint]?.[p.key]
                  : store.voiceSlotInfo[godInfo.pubkeyFingerprint]?.[p.key])
              : undefined;

            return (
              <div key={p.key}
                   className={`p-4 rounded-xl border-2 space-y-3 transition-colors ${
                     isCurrent ? 'border-shell-500 bg-shell-500/5' : 'border-border-muted bg-surface-2/40'
                   }`}>
                <div className="flex items-center gap-3">
                  <span className={`text-lg ${isCurrent ? 'text-shell-400' : 'text-text-muted'}`}>
                    {isCurrent ? '●' : '○'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-base font-semibold ${isCurrent ? 'text-shell-300' : 'text-text-primary'}`}>
                      {p.displayName}
                    </div>
                    <div className="text-xs text-text-muted">{p.tagline}</div>
                  </div>
                </div>

                {/* ── Saved state ── */}
                {slotPresent && (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-shell-500/5 border border-shell-500/20 flex items-center gap-3">
                      <ShieldCheck size={16} className="text-shell-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-shell-300">
                          Sealed for {slotInfo?.godRecipient ?? 'god'}
                          {slotInfo?.fingerprintShort && (
                            <span className="text-shell-400/70 font-mono ml-1.5">
                              · sha256:{slotInfo.fingerprintShort}…
                            </span>
                          )}
                        </div>
                        <div className="text-2xs text-text-muted mt-0.5">
                          {slotInfo?.savedAt && (
                            <>saved {new Date(slotInfo.savedAt).toLocaleString()}</>
                          )}
                          {slotInfo?.lastTestResult && (
                            <span className="ml-2">
                              · last test{' '}
                              {slotInfo.lastTestResult.ok
                                ? <span className="text-green-400">✓ valid</span>
                                : <span className="text-red-400">✗ {slotInfo.lastTestResult.error?.slice(0, 40) ?? 'failed'}</span>}
                              {slotInfo.lastTestResult.tookMs != null && (
                                <span className="text-text-muted"> ({slotInfo.lastTestResult.tookMs}ms)</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-2xs text-text-muted italic">
                      Your key can no longer be viewed from this device — only the god can decrypt it, and only for one request at a time. Test it any time; replace by deleting and pasting a new one.
                    </p>
                  </div>
                )}

                {/* ── Unsaved / paste state ── */}
                {!slotPresent && p.requiresKey && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">API key</label>
                    <div className="flex gap-2">
                      <input
                        type={draft.reveal ? 'text' : 'password'}
                        value={draft.key}
                        onChange={(e) => patchDraft(p.key, { key: e.target.value })}
                        placeholder={exampleKeyFor(p.key)}
                        className="flex-1 bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 font-mono"
                      />
                      <button
                        onClick={() => void handlePaste(p.key, 'key')}
                        className="px-3 py-2 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                        title="Paste from clipboard"
                      >
                        <ClipboardPaste size={14} />
                        Paste
                      </button>
                      <button
                        onClick={() => patchDraft(p.key, { reveal: !draft.reveal })}
                        className="px-3 py-2 bg-surface-3 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                        title={draft.reveal ? 'Hide' : 'Reveal'}
                      >
                        {draft.reveal ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {p.requiresEndpoint && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Endpoint URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={draft.endpoint}
                        onChange={(e) => patchDraft(p.key, { endpoint: e.target.value })}
                        placeholder={p.defaultEndpointUrl ?? 'http://localhost:PORT'}
                        className="flex-1 bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 font-mono"
                      />
                      <button
                        onClick={() => void handlePaste(p.key, 'endpoint')}
                        className="px-3 py-2 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                        title="Paste from clipboard"
                      >
                        <ClipboardPaste size={14} />
                        Paste
                      </button>
                    </div>
                    <div className="text-2xs text-text-muted">
                      ⓘ This is the URL {(godInfo?.displayName ?? 'the agent')} will call, not this browser.
                    </div>
                  </div>
                )}

                {/* ── Ceremony steps (rendered inline under the row) ── */}
                {ui.steps.length > 0 && (
                  <div className="p-3 rounded-lg bg-surface-2/60 border border-border-muted space-y-2">
                    {ui.steps.map((step, i) => (
                      <CeremonyRow key={i} step={step} />
                    ))}
                  </div>
                )}

                {/* ── Action buttons ── */}
                <div className="flex gap-2 items-center flex-wrap">
                  {!slotPresent && (p.requiresKey || p.requiresEndpoint) && (
                    <button
                      onClick={() => void handleSaveAndSeal(p)}
                      disabled={ui.busy}
                      className="px-4 py-1.5 text-xs font-semibold bg-shell-500 text-black hover:bg-shell-400 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Lock size={12} />
                      {ui.busy ? 'Sealing…' : 'Save & Seal'}
                    </button>
                  )}
                  {slotPresent && (
                    <button
                      onClick={() => void handleTest(p)}
                      disabled={ui.busy}
                      className="px-3 py-1.5 text-xs font-semibold bg-surface-3 text-text-secondary hover:bg-surface-2 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      title="Re-run the cosmos-logos handshake + provider validity check"
                    >
                      {ui.busy ? <RefreshCw size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                      Test
                    </button>
                  )}
                  <div className="flex-1" />
                  {slotPresent && (
                    ui.pendingDelete ? (
                      <>
                        <button
                          onClick={() => void handleDeleteConfirm(p)}
                          className="px-3 py-1.5 text-xs bg-red-500 text-white hover:bg-red-400 rounded-lg transition-colors"
                        >
                          Delete anyway
                        </button>
                        <button
                          onClick={() => handleDeleteCancel(p)}
                          className="px-3 py-1.5 text-xs bg-surface-3 text-text-secondary hover:bg-surface-2 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleDeleteInitiate(p)}
                        className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Delete this stored key"
                      >
                        <Trash2 size={14} />
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handleChoose(p)}
                    disabled={isCurrent || (!slotPresent && (p.requiresKey || p.requiresEndpoint))}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-shell-500/10 text-shell-400/60 cursor-default'
                        : (!slotPresent && (p.requiresKey || p.requiresEndpoint))
                        ? 'bg-surface-3 text-text-muted/60 cursor-not-allowed'
                        : 'bg-shell-500 text-black hover:bg-shell-400'
                    }`}
                    title={
                      isCurrent
                        ? 'This is your current provider'
                        : (!slotPresent && p.requiresKey)
                        ? 'Save & Seal a key first'
                        : 'Set as active'
                    }
                  >
                    {isCurrent ? (<><Check size={12} className="inline mr-1" /> Current</>) : 'Choose'}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Commodity + protection footer */}
          <div className="pt-4 space-y-3 border-t border-border-muted">
            <p className="text-xs text-text-muted text-center italic">
              Every AI is a commodity. If one gets too expensive, switch. Your Guardian doesn't care.
            </p>
            <p className="text-2xs text-text-muted flex items-start gap-2">
              <ShieldCheck size={14} className="flex-shrink-0 mt-0.5 text-shell-500/70" />
              <span>
                Your keys are sealed against the exact server that will use them at the moment you paste. This browser can no longer read them; only {(godInfo?.displayName ?? 'the agent')} can. Ares and Hermes see opaque bytes; if either god's key rotates, your saved key stops working and you'll be asked to re-enter — that's the security posture.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── One ceremony step row ───

function CeremonyRow({ step }: { step: CeremonyStep }) {
  const Icon = iconFor(step.status);
  const iconColor = colorFor(step.status);
  return (
    <div className="flex gap-2.5">
      <div className="flex-shrink-0 mt-0.5">
        <Icon size={14} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-xs font-semibold ${
          step.status === 'ok'   ? 'text-green-400' :
          step.status === 'fail' ? 'text-red-400'   :
          'text-text-secondary'
        }`}>
          {step.label}
        </div>
        {step.detail && (
          <div className={`text-2xs mt-0.5 whitespace-pre-wrap break-all ${
            step.mono
              ? `font-mono bg-surface-2 rounded px-2 py-1.5 border border-border-muted ${
                  step.status === 'ok'   ? 'text-green-400/80 border-green-500/20 bg-green-500/5' :
                  step.status === 'fail' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                  'text-text-muted'
                }`
              : step.status === 'ok'   ? 'text-green-400/80'
              : step.status === 'fail' ? 'text-red-400'
              : 'text-text-muted'
          }`}>
            {step.detail}
          </div>
        )}
      </div>
    </div>
  );
}

function iconFor(status: CeremonyStep['status']) {
  switch (status) {
    case 'lock':   return Lock;
    case 'unlock': return Unlock;
    case 'hash':   return Hash;
    case 'sign':   return PenTool;
    case 'send':   return Send;
    case 'ok':     return CheckCircle;
    case 'fail':   return XCircle;
    default:       return CheckCircle;
  }
}

function colorFor(status: CeremonyStep['status']) {
  switch (status) {
    case 'lock':   return 'text-shell-400';
    case 'unlock': return 'text-amber-400';
    case 'hash':   return 'text-blue-400';
    case 'sign':   return 'text-purple-400';
    case 'send':   return 'text-cyan-400';
    case 'ok':     return 'text-green-400';
    case 'fail':   return 'text-red-400';
    default:       return 'text-text-muted';
  }
}

// Preserve X import from previous version — kept referenced so tree-shaking
// doesn't warn on an unused icon in Legacy modules that may re-import it.
void X;

// Reserve StoredSlot symbol for anyone importing it via this file (some
// dev-mode debug helpers reach for it).
export type { StoredSlot };
