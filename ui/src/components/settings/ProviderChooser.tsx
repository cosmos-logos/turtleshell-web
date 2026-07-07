// src/components/settings/ProviderChooser.tsx
//
// Reusable BYOK provider picker for the Sovereign AI section of Settings.
// Structural mirror of omens' ProviderChooserModal.cs — every provider row
// is a visual peer, seeded from its per-provider slot on open, with a
// mandatory PASTE button (Steward directive: never require typing keys) and
// a reveal toggle. Test-key button is a phase-1 shimmer stub; phase 2 will
// wire a real /v1/{god}/byok/test that seals + roundtrips a validation call.

import { useEffect, useState } from 'react';
import { Eye, EyeOff, ClipboardPaste, Trash2, Check, X, ShieldCheck } from 'lucide-react';
import { providersFor, type SovereignCategory, type SovereignProvider } from '@/lib/sovereign-ai/provider-catalog';
import {
  useSovereignAiStore,
  getChatByokFor,
  getChatEndpointFor,
  getVoiceByokFor,
  getVoiceEndpointFor,
} from '@/lib/store/sovereign-ai-store';

interface Props {
  category: SovereignCategory;
  open: boolean;
  onClose: () => void;
}

interface RowDraft {
  key: string;
  endpoint: string;
  reveal: boolean;
  testResult: string;
  testOk: boolean;
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

export function ProviderChooser({ category, open, onClose }: Props) {
  const store = useSovereignAiStore();
  const currentProvider = category === 'chat' ? store.chatProvider : store.voiceProvider;
  const setProvider = category === 'chat' ? store.setChatProvider : store.setVoiceProvider;
  const clearFor = category === 'chat' ? store.clearChatByokFor : store.clearVoiceByokFor;

  // Row drafts — per-provider input state BEFORE the user hits Choose.
  // Seeded from the store's per-provider slot on open so switching providers
  // never wipes the previous provider's key. Explicit Clear removes it.
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});

  useEffect(() => {
    if (!open) return;
    const seed: Record<string, RowDraft> = {};
    for (const p of providersFor(category)) {
      seed[p.key] = {
        key: (category === 'chat' ? getChatByokFor(p.key) : getVoiceByokFor(p.key)) ?? '',
        endpoint:
          (category === 'chat' ? getChatEndpointFor(p.key) : getVoiceEndpointFor(p.key)) ??
          (p.requiresEndpoint ? (p.defaultEndpointUrl ?? '') : ''),
        reveal: false,
        testResult: '',
        testOk: false,
      };
    }
    setDrafts(seed);
  }, [open, category]);

  if (!open) return null;

  const updateDraft = (providerKey: string, patch: Partial<RowDraft>) => {
    setDrafts((d) => ({ ...d, [providerKey]: { ...d[providerKey]!, ...patch, testResult: '', testOk: false } }));
  };

  const handlePaste = async (providerKey: string, field: 'key' | 'endpoint') => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) return;
      updateDraft(providerKey, { [field]: text } as Partial<RowDraft>);
    } catch { /* clipboard denied; user can still type */ }
  };

  const handleChoose = (p: SovereignProvider) => {
    const draft = drafts[p.key];
    if (!draft) return;
    const key = p.requiresKey ? (draft.key || null) : null;
    const endpoint = p.requiresEndpoint ? (draft.endpoint || null) : null;
    setProvider(p.key, key, endpoint);
    onClose();
  };

  const handleTest = async (p: SovereignProvider) => {
    // Phase 1 shimmer stub — always returns Ready. Phase 2 will POST to
    // /v1/{god}/byok/test with a sealed validation envelope and surface
    // the real provider response.
    updateDraft(p.key, { testResult: 'Testing…', testOk: false });
    await new Promise((r) => setTimeout(r, 500));
    setDrafts((d) => ({
      ...d,
      [p.key]: { ...d[p.key]!, testResult: '✓ Ready (phase-1 stub)', testOk: true },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-1 border border-shell-500/40 rounded-2xl shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface-1 border-b border-border-muted px-6 py-4 flex items-center gap-3">
          <button onClick={onClose} className="text-shell-400 hover:text-shell-300 text-sm">
            ‹ Back
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-shell-300">
            {category === 'chat' ? 'Chat AI' : 'Voice AI'}
          </h2>
          <div className="w-14" />
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-text-secondary">
            {category === 'chat'
              ? 'Pick who thinks for your Guardian. You can change this any time.'
              : 'Pick who speaks for your Guardian. You can change this any time.'}
          </p>

          {providersFor(category).map((p) => {
            const draft = drafts[p.key];
            if (!draft) return null;
            const isCurrent = currentProvider === p.key;

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

                {p.requiresKey && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary">API key</label>
                    <div className="flex gap-2">
                      <input
                        type={draft.reveal ? 'text' : 'password'}
                        value={draft.key}
                        onChange={(e) => updateDraft(p.key, { key: e.target.value })}
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
                        onClick={() => updateDraft(p.key, { reveal: !draft.reveal })}
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
                        onChange={(e) => updateDraft(p.key, { endpoint: e.target.value })}
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
                      ⓘ This is the URL {category === 'chat' ? 'Athena' : 'Apollo'} will call, not this browser.
                    </div>
                  </div>
                )}

                <div className="flex gap-2 items-center flex-wrap">
                  {(p.requiresKey || p.requiresEndpoint) && (
                    <>
                      <button
                        onClick={() => void handleTest(p)}
                        className="px-3 py-1.5 text-xs font-semibold bg-surface-3 text-text-secondary hover:bg-surface-2 rounded-lg transition-colors"
                      >
                        Test
                      </button>
                      {draft.testResult && (
                        <span className={`text-xs ${draft.testOk ? 'text-green-400' : 'text-yellow-400'}`}>
                          {draft.testResult}
                        </span>
                      )}
                    </>
                  )}
                  <div className="flex-1" />
                  {(p.requiresKey || p.requiresEndpoint) && (getChatByokFor(p.key) || getVoiceByokFor(p.key)) && (
                    <button
                      onClick={() => { clearFor(p.key); updateDraft(p.key, { key: '', endpoint: p.requiresEndpoint ? (p.defaultEndpointUrl ?? '') : '' }); }}
                      className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-1.5"
                      title="Revoke stored key/endpoint"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                  <button
                    onClick={() => handleChoose(p)}
                    disabled={isCurrent}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-shell-500/10 text-shell-400/60 cursor-default'
                        : 'bg-shell-500 text-black hover:bg-shell-400'
                    }`}
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
                Your keys stay in your browser. When they need to travel, they are sealed for the exact server that will use them — Ares and Hermes see only opaque bytes, and even we can't read what you send.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small dismiss-X icon reuse (imported to avoid unused-import warnings when chooser isn't rendered).
void X;
