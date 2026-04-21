// Shared guide-selection screens used by two flows:
//   - Initial onboarding (routes/onboarding/Onboarding.tsx)
//   - Settings → Change Guide (routes/settings/ChangeGuide.tsx)
//
// Both flows need the same look + feel. Extracted so the Change Guide route
// can reuse the exact UI without the surrounding Onboarding state machine
// (cause/tier/final/etc).

import { useState } from 'react';
import { GUIDES, BYOK_GUIDES, type GuideKey } from './OnboardingData';
import { setUserApiKey } from '@/lib/store/agent-store';

// ── Shared button ──────────────────────────────────────
export function GuideBtn({ children, onClick, disabled, variant = 'primary', className = '' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'ghost'; className?: string;
}) {
  const base = 'w-full max-w-[320px] py-3.5 px-6 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed';
  const styles = {
    primary: `${base} bg-shell-500 text-white hover:bg-shell-600 hover:-translate-y-px active:translate-y-0`,
    ghost: `${base} bg-transparent border border-border-muted text-text-muted hover:border-shell-500/40 hover:text-shell-400`,
  };
  return <button onClick={onClick} disabled={disabled} className={`${styles[variant]} ${className}`}>{children}</button>;
}

// ── Guide grid entry metadata ──────────────────────────
// Order: Athena first (the core LLM router), then the two bundled personas,
// then Build Your Own as a Soon teaser. Cosmos and Logos went GA in the
// manifest-driven routing pass; Custom ("Build Your Own") stays gated with
// a "Soon" badge.
export interface GuideEntry {
  key: GuideKey;
  style: string;
  selectedBg: string;
  selectedBorder: string;
  soon?: boolean;
  configured?: boolean;
}

export const GUIDE_ENTRIES: readonly Omit<GuideEntry, 'configured'>[] = [
  { key: 'athena', style: 'text-purple-400', selectedBg: 'bg-purple-500/10', selectedBorder: 'border-purple-500/40' },
  { key: 'cosmos', style: 'text-shell-400', selectedBg: 'bg-shell-500/10', selectedBorder: 'border-shell-500/40' },
  { key: 'logos',  style: 'text-teal-400',  selectedBg: 'bg-teal-500/10',  selectedBorder: 'border-teal-500/40'  },
  { key: 'custom', style: 'text-amber-400', selectedBg: 'bg-amber-500/10', selectedBorder: 'border-amber-500/40', soon: true },
];

// ── Guide Choose Screen ────────────────────────────────
export function GuideChooseScreen({
  title = 'Choose Your Guide',
  subtitle = 'Who walks with you through the ocean?',
  selected,
  onSelect,
  onNext,
  onByok,
  configuredIds = new Set<string>(),
  primaryLabel = 'This Is My Guide',
  byokLabel = 'Use your own API keys →',
}: {
  title?: string;
  subtitle?: string;
  selected: GuideKey | null;
  onSelect: (k: GuideKey) => void;
  onNext: () => void;
  onByok: () => void;
  /** IDs of guides the user has already configured — renders a subtle badge so
   *  the user can see their existing set while picking another. */
  configuredIds?: Set<string>;
  primaryLabel?: string;
  byokLabel?: string;
}) {
  const visibleGuides = GUIDE_ENTRIES;
  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-16 pb-12 text-center px-4">
      <h1 className="text-2xl font-bold mb-2 text-text-primary">{title}</h1>
      <p className="text-sm mb-7 text-text-muted">{subtitle}</p>

      <div className="flex flex-col gap-3 w-full max-w-[340px] mb-8">
        {visibleGuides.map(({ key, style, selectedBg, selectedBorder, soon }) => {
          const g = GUIDES[key];
          const sel = selected === key;
          const alreadyConfigured = configuredIds.has(key);
          return (
            <button key={key} onClick={() => { if (!soon) onSelect(key); }} disabled={soon}
              className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 border ${
                soon ? 'opacity-45 cursor-not-allowed bg-surface-1 border-border-muted'
                     : `hover:-translate-y-0.5 ${sel ? `${selectedBg} ${selectedBorder}` : 'bg-surface-1 border-border-muted'}`
              }`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0 border transition-all ${
                sel ? `${selectedBorder} shadow-lg` : 'bg-surface-2 border-border-muted'
              }`}>
                {g.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold mb-0.5 ${style} flex items-center gap-1.5`}>
                  {g.name}
                  {alreadyConfigured && !soon && (
                    <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-shell-500/15 text-shell-400 border border-shell-500/30">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1">{g.role}</div>
                <div className="text-xs text-text-muted leading-relaxed">{g.desc}</div>
              </div>
              {soon ? (
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 bg-surface-2 border border-border-muted text-text-muted">
                  Soon
                </span>
              ) : (
                <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[10px] shrink-0 ${
                  sel ? 'bg-shell-500 border-shell-500 text-white' : 'border-border-muted'
                }`}>{sel ? '✓' : ''}</div>
              )}
            </button>
          );
        })}
      </div>

      <GuideBtn onClick={onNext} disabled={!selected}>{primaryLabel}</GuideBtn>

      <button onClick={onByok}
        className="mt-4 text-xs text-text-muted hover:text-shell-400 transition-colors underline underline-offset-2">
        {byokLabel}
      </button>
    </div>
  );
}

// ── BYOK Provider Selection + API Key ──────────────────
export const BYOK_PROVIDERS: readonly { id: string; name: string; icon: string; style: string; selectedBg: string; selectedBorder: string; keyUrl: string; placeholder: string }[] = [
  { id: 'openai', name: 'OpenAI', icon: '💬', style: 'text-emerald-400', selectedBg: 'bg-emerald-500/10', selectedBorder: 'border-emerald-500/40', keyUrl: 'https://platform.openai.com/api-keys',      placeholder: 'sk-...'      },
  { id: 'claude', name: 'Claude', icon: '🤖', style: 'text-orange-400',  selectedBg: 'bg-orange-500/10',  selectedBorder: 'border-orange-500/40',  keyUrl: 'https://console.anthropic.com/settings/keys', placeholder: 'sk-ant-...'  },
  { id: 'grok',   name: 'Grok',   icon: '🔥', style: 'text-red-400',     selectedBg: 'bg-red-500/10',     selectedBorder: 'border-red-500/40',     keyUrl: 'https://console.x.ai/team/default/api-keys',  placeholder: 'xai-...'     },
  { id: 'gemini', name: 'Gemini', icon: '✦',  style: 'text-blue-400',    selectedBg: 'bg-blue-500/10',    selectedBorder: 'border-blue-500/40',    keyUrl: 'https://aistudio.google.com/apikey',          placeholder: 'AIza...'     },
];

export function ByokScreen({
  selected,
  onSelect,
  onNext,
  onBack,
  configuredIds = new Set<string>(),
  title = 'Bring Your Own Key',
  subtitle = 'Choose a provider and enter your API key.',
  primaryLabel = 'This Is My Guide',
  backLabel = 'Back',
}: {
  selected: GuideKey | null;
  onSelect: (k: GuideKey) => void;
  onNext: () => void;
  onBack: () => void;
  configuredIds?: Set<string>;
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  backLabel?: string;
}) {
  const [apiKey, setApiKey] = useState('');
  const provider = BYOK_PROVIDERS.find(p => p.id === selected);

  const handleNext = () => {
    if (selected && apiKey.trim()) {
      setUserApiKey(selected as 'openai' | 'claude' | 'grok' | 'gemini', apiKey.trim());
    }
    onNext();
  };

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-16 pb-12 text-center px-4">
      <h1 className="text-2xl font-bold mb-2 text-text-primary">{title}</h1>
      <p className="text-sm mb-7 text-text-muted">{subtitle}</p>

      <div className="flex flex-col gap-3 w-full max-w-[340px] mb-6">
        {BYOK_PROVIDERS.map(({ id, name, icon, style, selectedBg, selectedBorder }) => {
          const sel = selected === id;
          const alreadyConfigured = configuredIds.has(id);
          return (
            <button key={id} onClick={() => { onSelect(id as GuideKey); setApiKey(''); }}
              className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 hover:-translate-y-0.5 border ${
                sel ? `${selectedBg} ${selectedBorder}` : 'bg-surface-1 border-border-muted'
              }`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0 border transition-all ${
                sel ? `${selectedBorder} shadow-lg` : 'bg-surface-2 border-border-muted'
              }`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${style} flex items-center gap-1.5`}>
                  {name}
                  {alreadyConfigured && (
                    <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-shell-500/15 text-shell-400 border border-shell-500/30">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-muted">
                  {alreadyConfigured ? 'Re-enter your key to refresh' : 'Bring your own API key'}
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[10px] shrink-0 ${
                sel ? 'bg-shell-500 border-shell-500 text-white' : 'border-border-muted'
              }`}>{sel ? '✓' : ''}</div>
            </button>
          );
        })}
      </div>

      {selected && provider && BYOK_GUIDES[selected] && (
        <div className="w-full max-w-[340px] mb-8 animate-fade-in">
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            {provider.name} API Key
          </label>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)}
            type="text"
            autoComplete="off"
            placeholder={provider.placeholder}
            className="w-full px-4 py-3 rounded-xl text-sm bg-surface-1 border border-border-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 font-mono" />
          <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer"
            className="inline-block mt-2 text-xs text-shell-400 hover:text-shell-300 transition-colors underline underline-offset-2">
            Get your {provider.name} API key →
          </a>
        </div>
      )}

      <GuideBtn onClick={handleNext} disabled={!selected || !apiKey.trim()}>{primaryLabel}</GuideBtn>
      <GuideBtn variant="ghost" onClick={onBack} className="mt-3">{backLabel}</GuideBtn>
    </div>
  );
}
