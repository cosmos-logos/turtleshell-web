import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CAUSES, TIERS, PERKS, GUIDES, BYOK_GUIDES, CREATURES, type GuideKey, type CauseIndex } from './OnboardingData';
import { useTestBetaEnabled } from '@/lib/beta';
import { ogRequest, getShellId } from '@/lib/api/olympus-grid-client';
import { plutusClient } from '@/lib/api/plutus-client';
import { useAgentStore, setUserApiKey } from '@/lib/store/agent-store';
import { useChatStore } from '@/lib/store/chat-store';

type Step =
  | 'cause'
  | 'guide-choose'
  | 'guide-byok'
  | 'guide-custom'
  | 'guide-dive'
  | 'guide-tour'
  | 'shells'
  | 'tier'
  | 'final';

const STEP_ORDER: Step[] = ['cause', 'guide-choose', 'guide-dive', 'guide-tour', 'shells', 'tier', 'final'];
const TOTAL_DOTS = STEP_ORDER.length; // custom is inline, not a dot

function Btn({ children, onClick, disabled, variant = 'primary', className = '' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'ghost'; className?: string;
}) {
  const base = 'w-full max-w-[320px] py-3.5 px-6 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed';
  const styles = {
    primary: `${base} bg-shell-500 text-white hover:bg-shell-600 hover:-translate-y-px active:translate-y-0`,
    ghost: `${base} bg-transparent border border-border-muted text-text-muted hover:border-shell-500/40 hover:text-shell-400`,
  };
  return <button onClick={onClick} disabled={disabled} className={`${styles[variant]} ${className}`}>{children}</button>;
}

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-[7px] justify-center pt-8 pb-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 h-[7px] ${
          i === current ? 'w-6 bg-shell-500' : i < current ? 'w-[7px] bg-white/15' : 'w-[7px] bg-white/10'
        }`} />
      ))}
    </div>
  );
}

function ScrollHint({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const canScroll = el.scrollHeight - el.scrollTop - el.clientHeight > 40;
      setShow(canScroll);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => { el.removeEventListener('scroll', check); observer.disconnect(); };
  }, [scrollRef]);

  if (!show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 animate-bounce pointer-events-none">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-shell-500/60">
        <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function Particles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className="absolute rounded-full bg-shell-500/[0.06]" style={{
          width: 3 + (i % 3), height: 3 + (i % 3),
          left: `${10 + i * 15}%`, top: `${20 + (i * 13) % 60}%`,
          animation: `particle-drift ${14 + i * 2}s ease-in-out infinite`,
          animationDelay: `${i * 1.5}s`,
        }} />
      ))}
    </div>
  );
}

const GUIDE_ENTRIES: { key: GuideKey; style: string; selectedBg: string; selectedBorder: string }[] = [
  { key: 'cosmos', style: 'text-shell-400', selectedBg: 'bg-shell-500/10', selectedBorder: 'border-shell-500/40' },
  { key: 'logos', style: 'text-teal-400', selectedBg: 'bg-teal-500/10', selectedBorder: 'border-teal-500/40' },
  { key: 'athena', style: 'text-purple-400', selectedBg: 'bg-purple-500/10', selectedBorder: 'border-purple-500/40' },
  { key: 'custom', style: 'text-amber-400', selectedBg: 'bg-amber-500/10', selectedBorder: 'border-amber-500/40' },
];

// ── Screen: Choose Your Cause ────────────────────────
function CauseScreen({ onNext, selectedCause, setSelectedCause }: {
  onNext: () => void; selectedCause: CauseIndex | null; setSelectedCause: (c: CauseIndex) => void;
}) {
  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-16 pb-12 text-center px-4">
      <h1 className="text-2xl font-bold mb-2 text-text-primary">Choose Your Cause</h1>
      <p className="text-sm mb-4 text-text-muted">7% of every shell you spend flows here — every turn, forever.</p>
      <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs tracking-widest uppercase font-medium bg-amber-500/10 border border-amber-500/25 text-amber-400">
        🐚 7% tithe · every turn · always
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[340px] mb-6">
        {CAUSES.map((cause, i) => {
          const sel = selectedCause === i;
          return (
            <button key={i} onClick={() => setSelectedCause(i as CauseIndex)}
              className={`flex items-center gap-3.5 p-4 rounded-xl text-left transition-all duration-200 hover:-translate-y-0.5 border ${
                sel ? 'bg-shell-500/10 border-shell-500/40' : 'bg-surface-1 border-border-muted'
              }`}>
              <span className="text-[30px]">{cause.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-text-primary mb-0.5">{cause.name}</div>
                <div className="text-xs text-text-muted">{cause.desc}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[10px] ${
                sel ? 'bg-shell-500 border-shell-500 text-white' : 'border-border-muted'
              }`}>{sel ? '✓' : ''}</div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-center max-w-[280px] leading-relaxed mb-8 text-text-muted">
        This choice is <span className="font-bold text-amber-400">permanent</span> to your account. It defines who you are in the ocean.
      </p>
      <Btn onClick={onNext} disabled={selectedCause === null}>This Is My Cause</Btn>
    </div>
  );
}

// ── Screen: Choose Your Guide ──────────────────────
function GuideChooseScreen({ selected, onSelect, onNext, onByok, testBetaEnabled }: {
  selected: GuideKey | null; onSelect: (k: GuideKey) => void; onNext: () => void; onByok: () => void;
  testBetaEnabled: boolean;
}) {
  // Beta-off users see only the three core guides (Athena / Cosmos / Logos).
  // Custom + BYOK are advanced surfaces.
  const visibleGuides = testBetaEnabled
    ? GUIDE_ENTRIES
    : GUIDE_ENTRIES.filter(g => g.key !== 'custom');
  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-16 pb-12 text-center px-4">
      <h1 className="text-2xl font-bold mb-2 text-text-primary">Choose Your Guide</h1>
      <p className="text-sm mb-7 text-text-muted">Who walks with you through the ocean?</p>

      <div className="flex flex-col gap-3 w-full max-w-[340px] mb-8">
        {visibleGuides.map(({ key, style, selectedBg, selectedBorder }) => {
          const g = GUIDES[key];
          const sel = selected === key;
          return (
            <button key={key} onClick={() => onSelect(key)}
              className={`flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 hover:-translate-y-0.5 border ${
                sel ? `${selectedBg} ${selectedBorder}` : 'bg-surface-1 border-border-muted'
              }`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0 border transition-all ${
                sel ? `${selectedBorder} shadow-lg` : 'bg-surface-2 border-border-muted'
              }`}>
                {g.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold mb-0.5 ${style}`}>{g.name}</div>
                <div className="text-[11px] uppercase tracking-wider text-text-muted mb-1">{g.role}</div>
                <div className="text-xs text-text-muted leading-relaxed">{g.desc}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[10px] shrink-0 ${
                sel ? 'bg-shell-500 border-shell-500 text-white' : 'border-border-muted'
              }`}>{sel ? '✓' : ''}</div>
            </button>
          );
        })}
      </div>

      <Btn onClick={onNext} disabled={!selected}>This Is My Guide</Btn>

      {testBetaEnabled && (
        <button onClick={onByok}
          className="mt-4 text-xs text-text-muted hover:text-shell-400 transition-colors underline underline-offset-2">
          Use your own API keys →
        </button>
      )}
    </div>
  );
}

// ── Screen: BYOK Provider Selection + API Key ─────
const BYOK_PROVIDERS: { id: string; name: string; icon: string; style: string; selectedBg: string; selectedBorder: string; keyUrl: string; placeholder: string }[] = [
  { id: 'openai', name: 'OpenAI', icon: '💬', style: 'text-emerald-400', selectedBg: 'bg-emerald-500/10', selectedBorder: 'border-emerald-500/40', keyUrl: 'https://platform.openai.com/api-keys', placeholder: 'sk-...' },
  { id: 'claude', name: 'Claude', icon: '🤖', style: 'text-orange-400', selectedBg: 'bg-orange-500/10', selectedBorder: 'border-orange-500/40', keyUrl: 'https://console.anthropic.com/settings/keys', placeholder: 'sk-ant-...' },
  { id: 'grok', name: 'Grok', icon: '🔥', style: 'text-red-400', selectedBg: 'bg-red-500/10', selectedBorder: 'border-red-500/40', keyUrl: 'https://console.x.ai/team/default/api-keys', placeholder: 'xai-...' },
  { id: 'gemini', name: 'Gemini', icon: '✦', style: 'text-blue-400', selectedBg: 'bg-blue-500/10', selectedBorder: 'border-blue-500/40', keyUrl: 'https://aistudio.google.com/apikey', placeholder: 'AIza...' },
];

function ByokScreen({ selected, onSelect, onNext, onBack }: {
  selected: GuideKey | null; onSelect: (k: GuideKey) => void; onNext: () => void; onBack: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const provider = BYOK_PROVIDERS.find(p => p.id === selected);

  const handleNext = () => {
    if (selected && apiKey.trim()) {
      setUserApiKey(selected as any, apiKey.trim());
    }
    onNext();
  };

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-16 pb-12 text-center px-4">
      <h1 className="text-2xl font-bold mb-2 text-text-primary">Bring Your Own Key</h1>
      <p className="text-sm mb-7 text-text-muted">Choose a provider and enter your API key.</p>

      <div className="flex flex-col gap-3 w-full max-w-[340px] mb-6">
        {BYOK_PROVIDERS.map(({ id, name, icon, style, selectedBg, selectedBorder }) => {
          const sel = selected === id;
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
                <div className={`text-sm font-semibold ${style}`}>{name}</div>
                <div className="text-xs text-text-muted">Bring your own API key</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[10px] shrink-0 ${
                sel ? 'bg-shell-500 border-shell-500 text-white' : 'border-border-muted'
              }`}>{sel ? '✓' : ''}</div>
            </button>
          );
        })}
      </div>

      {selected && provider && (
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

      <Btn onClick={handleNext} disabled={!selected || !apiKey.trim()}>This Is My Guide</Btn>
      <Btn variant="ghost" onClick={onBack} className="mt-3">Back</Btn>
    </div>
  );
}

// ── Screen: Custom Agent Creation ──────────────────
function GuideCustomScreen({ onBack, onComplete }: {
  onBack: () => void; onComplete: (name: string, personality: string, creature: string) => void;
}) {
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [creature, setCreature] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-16 pb-12 text-center px-4">
      <h1 className="text-2xl font-bold mb-2 text-text-primary">Name Your Guide</h1>
      <p className="text-sm mb-7 text-text-muted">Give it an identity. It will speak in the voice you define.</p>

      <div className="w-full max-w-[320px] space-y-5 mb-8">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Agent Name</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={24} placeholder="e.g. Oracle, Nova, Sage..."
            className="w-full px-4 py-3 rounded-xl text-sm bg-surface-1 border border-border-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Personality</label>
          <textarea value={personality} onChange={e => setPersonality(e.target.value)} rows={3}
            placeholder="Direct and precise. Speaks like a trusted advisor. Never wastes words..."
            className="w-full px-4 py-3 rounded-xl text-sm bg-surface-1 border border-border-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Choose a creature</label>
          <div className="grid grid-cols-5 gap-2">
            {CREATURES.map(c => (
              <button key={c} onClick={() => setCreature(c)}
                className={`aspect-square rounded-xl flex items-center justify-center text-2xl border transition-all ${
                  creature === c ? 'bg-shell-500/10 border-shell-500' : 'bg-surface-1 border-border-muted hover:border-shell-500/30'
                }`}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-[320px] space-y-3">
        <Btn onClick={() => { if (name.trim() && creature) onComplete(name.trim(), personality.trim(), creature); }}
          disabled={!name.trim() || !creature}>
          Create My Guide
        </Btn>
        <Btn variant="ghost" onClick={onBack}>Back</Btn>
      </div>
    </div>
  );
}

// ── Screen: The Dive (guide intro) ──────────────────
function GuideDiveScreen({ guide, onNext }: {
  guide: { emoji: string; name: string; role: string; greeting: string }; onNext: () => void;
}) {
  const [showGreeting, setShowGreeting] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowGreeting(true), 600); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-16 pb-12 text-center px-4">
      <div className="w-28 h-28 rounded-full bg-surface-2 border-2 border-shell-500/30 flex items-center justify-center text-6xl mb-5 shadow-lg shadow-shell-500/10 animate-pulse">
        {guide.emoji}
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-1">{guide.name}</h1>
      <p className="text-xs uppercase tracking-wider text-text-muted mb-6">{guide.role}</p>

      <div className={`text-lg italic leading-relaxed max-w-[300px] text-text-secondary whitespace-pre-line transition-opacity duration-700 mb-10 ${showGreeting ? 'opacity-100' : 'opacity-0'}`}>
        {guide.greeting}
      </div>

      <Btn onClick={onNext}>I'm ready</Btn>
    </div>
  );
}

// ── Screen: Menu Tour ──────────────────────────────
function GuideTourScreen({ guide, onNext }: {
  guide: { emoji: string; name: string; ready: string }; onNext: () => void;
}) {
  const [tourStep, setTourStep] = useState(0);
  const totalSteps = 10; // 7 messages + "I think I'm ready" + guide.ready + button
  useEffect(() => {
    if (tourStep >= totalSteps) return;
    const delay = 800;
    const t = setTimeout(() => setTourStep(s => s + 1), delay);
    return () => clearTimeout(t);
  }, [tourStep]);

  const messages: { role: 'guide' | 'user' | 'highlight'; text: string; icon?: string }[] = [
    { role: 'guide', text: 'The ocean has everything you need. Let me show you.' },
    { role: 'highlight', text: 'Agents — your fleet of guides', icon: '🤖' },
    { role: 'guide', text: 'Connect more gods — Poseidon for tools, Apollo for voice — and they appear in your fleet.' },
    { role: 'highlight', text: 'Services — connect your clouds', icon: '🔌' },
    { role: 'guide', text: 'Link Salesforce, GitHub, HubSpot. I can act on your behalf in any of them.' },
    { role: 'highlight', text: 'Sea Shells — your currency', icon: '🐚' },
    { role: 'guide', text: 'Every turn costs one shell. 7% flows to your cause. Your giving grows every time we speak.' },
    { role: 'user', text: 'I think I\'m ready.' },
    { role: 'guide', text: guide.ready },
  ];

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-start pt-16 pb-12 text-center px-4">
      <h1 className="text-lg font-bold text-text-primary mb-6">Here's your ocean</h1>

      <div className="w-full max-w-[340px] flex flex-col gap-3 mb-8">
        {messages.slice(0, tourStep).map((m, i) => {
          if (m.role === 'highlight') {
            return (
              <div key={i} className="flex items-center gap-2.5 bg-shell-500/10 border border-shell-500/20 rounded-xl px-4 py-2.5 text-sm text-shell-400 font-medium animate-fade-in">
                <span className="text-lg">{m.icon}</span> {m.text}
              </div>
            );
          }
          if (m.role === 'user') {
            return (
              <div key={i} className="flex justify-end animate-fade-in">
                <div className="bg-shell-500/10 border border-shell-500/20 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-text-secondary max-w-[240px]">
                  {m.text}
                </div>
              </div>
            );
          }
          return (
            <div key={i} className="flex items-start gap-2.5 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-lg shrink-0">
                {guide.emoji}
              </div>
              <div className="bg-surface-1 border border-border-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-text-secondary text-left max-w-[260px] leading-relaxed">
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      {tourStep >= totalSteps && (
        <Btn onClick={onNext} className="animate-fade-in">Let's Begin</Btn>
      )}
    </div>
  );
}

// ── Screen: Shells Arrive ────────────────────────────
function ShellsScreen({ onNext }: { onNext: () => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (count >= 1000) return;
    const t = setTimeout(() => setCount(c => Math.min(c + 28, 1000)), 18);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-16 pb-12 text-center px-4">
      <div className="relative mb-1">
        <div className="absolute inset-[-24px] rounded-full animate-pulse bg-amber-300/10" />
        <span className="text-[80px] block">🐚</span>
      </div>
      <div className="text-[72px] font-bold mb-1 text-amber-200">{count.toLocaleString()}</div>
      <div className="text-xs tracking-[0.28em] uppercase mb-8 text-text-muted">Sea Shells · Your Starting Balance</div>

      <div className="flex flex-col w-full max-w-[310px] mb-8">
        {PERKS.map((perk, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-border-muted last:border-0">
            <span className="text-base w-6 text-center shrink-0">{perk.icon}</span>
            <span className="flex-1 text-sm font-light text-text-secondary">{perk.label}</span>
            <span className="text-xs text-amber-200">{perk.cost}</span>
          </div>
        ))}
      </div>
      <Btn onClick={onNext}>Claim My Shells</Btn>
    </div>
  );
}

// ── Screen: Choose Your Tide (subscription) ──────────
function TierScreen({ onSubscribe, onSkip, selectedTier, setSelectedTier, subscribing }: {
  onSubscribe: () => void;
  onSkip: () => void;
  selectedTier: string | null;
  setSelectedTier: (t: string) => void;
  subscribing: boolean;
}) {
  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-16 pb-12 text-center px-4">
      <h1 className="text-2xl font-bold mb-2 text-text-primary">Choose Your Tide</h1>
      <p className="text-sm mb-8 text-text-muted">Recharge your shells. Cancel anytime.</p>

      <div className="flex flex-col gap-2 w-full max-w-[340px] mb-6">
        {TIERS.map(tier => {
          const sel = selectedTier === tier.id;
          return (
            <button key={tier.id} onClick={() => setSelectedTier(tier.id)}
              className={`relative flex items-center gap-3.5 p-4 rounded-xl text-left transition-all duration-200 hover:translate-x-0.5 border ${
                sel ? 'bg-shell-500/5 border-shell-500/40' : 'bg-surface-1 border-border-muted'
              }`}>
              {tier.popular && <span className="absolute -top-2.5 right-3.5 bg-shell-500 text-white text-[9px] tracking-widest uppercase px-2.5 py-0.5 rounded-md font-semibold">Most Popular</span>}
              <div className="flex-1">
                <div className="text-sm font-medium text-text-primary mb-0.5">{tier.name}</div>
                <div className="text-xs text-amber-200">{tier.shells}</div>
              </div>
              <div className="text-right">
                <span className={`font-semibold ${tier.isEnterprise ? 'text-sm text-amber-400' : 'text-lg text-shell-400'}`}>{tier.price}</span>
                {!tier.isEnterprise && <span className="block text-[10px] text-text-muted">/ month</span>}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-center max-w-[280px] leading-relaxed mb-8 text-text-muted">
        <span className="font-bold text-amber-400">7% of every shell spent</span> flows to your cause, regardless of tier.
      </p>
      <div className="w-full max-w-[320px] space-y-3">
        <Btn onClick={onSubscribe} disabled={!selectedTier || subscribing}>
          {subscribing
            ? 'Opening Stripe…'
            : selectedTier === 'enterprise'
              ? 'Contact Us'
              : selectedTier
                ? `Subscribe · ${TIERS.find(t => t.id === selectedTier)?.price ?? ''}/mo`
                : 'Start My Subscription'}
        </Btn>
        <Btn variant="ghost" onClick={onSkip} disabled={subscribing}>Start with my free shells first</Btn>
      </div>
    </div>
  );
}

// ── Screen: Enter the Ocean (final) ──────────────────
// Tier → monthly shells (matches Plutus TIER_SHELLS — must stay in sync).
// `null` = Abyss unlimited.
const TIER_SHELLS_MAP: Record<string, number | null> = {
  free: 0,
  beachcomber: 500,
  tide: 2000,
  reef: 10000,
  abyss: null,
};

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  beachcomber: 'Beachcomber',
  tide: 'Tide',
  reef: 'Reef',
  abyss: 'Abyss',
};

function FinalScreen({ guide, selectedCause, selectedTier, onComplete }: {
  guide: { emoji: string; name: string };
  selectedCause: CauseIndex | null;
  selectedTier: string | null;
  onComplete: () => void;
}) {
  const cause = selectedCause !== null ? CAUSES[selectedCause] : CAUSES[0];

  const SIGNUP_BONUS = 1000;
  const tierShells = selectedTier ? TIER_SHELLS_MAP[selectedTier] : 0;
  const isUnlimited = selectedTier === 'abyss';
  const hasPaidTier = !!selectedTier && selectedTier !== 'free' && !isUnlimited;
  const targetBalance = isUnlimited ? SIGNUP_BONUS : SIGNUP_BONUS + (tierShells ?? 0);
  const tierLabel = selectedTier ? (TIER_LABELS[selectedTier] ?? selectedTier) : null;

  // Three-phase choreography, matches the ShellsScreen → ShellRain patterns
  // already established in the product:
  //   phase 'granted' — show "1,000" pulsing + "Claim [Tier] Shells" button
  //     (user-triggered start; this is the "video-game click to roll" moment)
  //   phase 'rolling' — odometer ticks 1000 → target while shell rain pours
  //   phase 'ready'   — final number pops, cause banner appears, "Enter the
  //     Ocean" button fades in
  // For free/skipped path there's no upgrade to claim, so jump straight to
  // 'ready' with count = 1000.
  const [phase, setPhase] = useState<'granted' | 'rolling' | 'ready'>(
    hasPaidTier || isUnlimited ? 'granted' : 'ready',
  );
  const [count, setCount] = useState(SIGNUP_BONUS);

  // Rolling tick: step the counter toward target until it lands, then bump
  // to 'ready'. Same 18ms cadence and ease-feel as the ShellsScreen roll so
  // the two screens read as a single motion language across onboarding.
  useEffect(() => {
    if (phase !== 'rolling') return;
    if (count >= targetBalance) {
      const done = setTimeout(() => setPhase('ready'), 350);
      return () => clearTimeout(done);
    }
    const remaining = targetBalance - count;
    const step = Math.max(1, Math.ceil(remaining / 80));
    const t = setTimeout(() => setCount(c => Math.min(c + step, targetBalance)), 18);
    return () => clearTimeout(t);
  }, [phase, count, targetBalance]);

  // Shell rain — only active during the 'rolling' phase. Same 25-shell
  // count and animation curve as ShellRain on the Shells page so the
  // celebration looks identical across the two post-subscribe entry points.
  const rainShells = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 1.8 + Math.random() * 1.5,
      size: 20 + Math.random() * 22,
    })),
    [],
  );

  const claimButtonLabel = isUnlimited
    ? `Dive into the Abyss`
    : hasPaidTier
      ? `Claim my ${tierLabel} shells`
      : 'Claim my shells';

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-16 pb-12 text-center px-4 relative overflow-hidden">
      <style>{`
        @keyframes shellFall {
          0%   { transform: translateY(-100px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(110vh)  rotate(360deg); opacity: 0; }
        }
        @keyframes countPulse {
          0%   { transform: scale(1);    }
          50%  { transform: scale(1.04); }
          100% { transform: scale(1);    }
        }
        @keyframes finalPop {
          0%   { transform: scale(0.85); opacity: 0.6; }
          60%  { transform: scale(1.12); opacity: 1;   }
          100% { transform: scale(1);    opacity: 1;   }
        }
        @keyframes fadeUp {
          0%   { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {phase === 'rolling' && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {rainShells.map(s => (
            <span
              key={s.id}
              className="absolute select-none"
              style={{
                left: `${s.left}%`,
                top: 0,
                fontSize: `${s.size}px`,
                animation: `shellFall ${s.duration}s ease-in ${s.delay}s 1 forwards`,
                opacity: 0,
                animationFillMode: 'forwards',
              }}
            >🐚</span>
          ))}
        </div>
      )}

      {/* Hero shell — soft pulse in granted/ready, steady during roll */}
      <div className="relative z-10 mb-2">
        <div className={`absolute inset-[-24px] rounded-full bg-amber-300/10 ${phase !== 'rolling' ? 'animate-pulse' : ''}`} />
        <span className="text-[80px] block">🐚</span>
      </div>

      {/* Odometer */}
      <div
        key={phase}
        className="relative z-10 text-[72px] font-bold text-amber-200 tabular-nums leading-none"
        style={{
          animation: phase === 'ready'
            ? 'finalPop 0.55s ease-out forwards'
            : phase === 'rolling'
              ? 'countPulse 0.24s ease-in-out infinite'
              : undefined,
        }}
      >
        {isUnlimited ? '∞' : count.toLocaleString()}
      </div>
      <div className="relative z-10 text-xs tracking-[0.28em] uppercase mt-1 mb-2 text-text-muted">
        Sea Shells · {phase === 'granted' ? 'Signup Bonus' : phase === 'rolling' ? 'Loading your tier…' : 'Your Starting Balance'}
      </div>
      {hasPaidTier && phase === 'granted' && (
        <div className="relative z-10 text-sm text-shell-400 mb-6" style={{ animation: 'fadeUp 0.4s ease-out' }}>
          + {(tierShells as number).toLocaleString()} {tierLabel} shells waiting
        </div>
      )}
      {phase === 'ready' && (
        <div className="relative z-10 text-sm text-shell-400 mb-6" style={{ animation: 'fadeUp 0.5s ease-out' }}>
          🌊 0 shells given to {cause.name} so far
        </div>
      )}

      {phase === 'ready' && (
        <>
          <div className="relative z-10 flex gap-2 flex-wrap justify-center mb-8" style={{ animation: 'fadeUp 0.55s ease-out 0.1s backwards' }}>
            <span className="text-xs rounded-full px-3 py-1.5 bg-surface-1 border border-border-muted text-text-secondary">
              Guide: <span className="text-text-primary font-medium">{guide.emoji} {guide.name}</span>
            </span>
            <span className="text-xs rounded-full px-3 py-1.5 bg-surface-1 border border-border-muted text-text-secondary">
              Tithe: <span className="text-text-primary font-medium">7% / turn</span>
            </span>
          </div>

          <p className="relative z-10 text-sm text-text-muted leading-relaxed max-w-[280px] mb-8" style={{ animation: 'fadeUp 0.55s ease-out 0.2s backwards' }}>
            The ocean is sovereign.<br />Your keys never leave your device.<br />Your guide is waiting.
          </p>
        </>
      )}

      {/* Phase-gated primary action */}
      {phase === 'granted' && (
        <button
          onClick={() => { setCount(SIGNUP_BONUS); setPhase('rolling'); }}
          className="relative z-10 w-full max-w-[320px] py-3.5 rounded-xl text-base font-semibold transition-all hover:-translate-y-px active:translate-y-0 bg-gradient-to-r from-shell-500 to-amber-500 text-white shadow-lg shadow-shell-500/20"
          style={{ animation: 'fadeUp 0.4s ease-out 0.15s backwards' }}
        >
          {claimButtonLabel}
        </button>
      )}
      {phase === 'rolling' && (
        <button
          disabled
          className="relative z-10 w-full max-w-[320px] py-3.5 rounded-xl text-base font-semibold bg-shell-500/60 text-white/80 cursor-wait"
        >
          Loading your shells…
        </button>
      )}
      {phase === 'ready' && (
        <>
          <button
            onClick={onComplete}
            className="relative z-10 w-full max-w-[320px] py-3.5 rounded-xl text-base font-semibold transition-all hover:-translate-y-px active:translate-y-0 bg-gradient-to-r from-shell-500 to-amber-500 text-white shadow-lg shadow-shell-500/20"
            style={{ animation: 'fadeUp 0.5s ease-out 0.3s backwards' }}
          >
            Enter the Ocean
          </button>
          <div className="relative z-10 mt-4 text-[11px] tracking-widest uppercase text-text-muted" style={{ animation: 'fadeUp 0.5s ease-out 0.4s backwards' }}>
            Your sovereign AI begins now
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Onboarding Component ────────────────────────
export function Onboarding() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>('cause');
  const [selectedCause, setSelectedCause] = useState<CauseIndex | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideKey | null>(null);
  const [customAgent, setCustomAgent] = useState<{ name: string; personality: string; creature: string } | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const testBetaEnabled = useTestBetaEnabled();

  const { setActiveAgent, addAgent, agents } = useAgentStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Stripe success round-trip: success_url = /onboarding?step=final&welcome=<tier>
  // Fast-forward to the FinalScreen and restore the user's onboarding
  // selections from localStorage (they got wiped out of React state when
  // the browser navigated off to Stripe). If selections aren't in
  // localStorage (user entered onboarding directly at step=final), just
  // snap to the final step with defaults so they still see the celebration.
  useEffect(() => {
    if (searchParams.get('step') !== 'final') return;
    try {
      const raw = localStorage.getItem('turtleshell-onboarding');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.tier) setSelectedTier(saved.tier);
        if (saved.guide) setSelectedGuide(saved.guide);
        if (saved.cause != null) {
          const idx = CAUSES.findIndex(c => c.name === saved.cause);
          if (idx >= 0) setSelectedCause(idx as CauseIndex);
        }
      }
    } catch {}
    setStep('final');
    // Keep the welcome= param so FinalScreen / chat banner can still read it;
    // strip only the step param.
    const next = new URLSearchParams(searchParams);
    next.delete('step');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = useCallback((s: Step) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(s);
      setTransitioning(false);
      scrollRef.current?.scrollTo(0, 0);
    }, 300);
  }, []);

  const getGuideInfo = (): { emoji: string; name: string; role: string; greeting: string; ready: string } => {
    if (selectedGuide === 'custom' && customAgent) {
      return {
        emoji: customAgent.creature,
        name: customAgent.name,
        role: 'Your Agent · Your Identity',
        greeting: `I am ${customAgent.name}.\n${customAgent.personality || 'I am yours.\nTell me what you need\nand I will become it.'}`,
        ready: 'I am ready. What shall we do first?',
      };
    }
    if (selectedGuide && selectedGuide in BYOK_GUIDES) {
      return BYOK_GUIDES[selectedGuide]!;
    }
    if (selectedGuide && selectedGuide in GUIDES) {
      return GUIDES[selectedGuide as keyof typeof GUIDES];
    }
    return GUIDES.cosmos;
  };

  const [subscribing, setSubscribing] = useState(false);

  // Persist everything the user picked + set the active agent. This is the
  // "do the work of onboarding" half; navigation is handled by the callers
  // (handleComplete navigates to /app/chat; handleSubscribe redirects to
  // Stripe Checkout instead).
  const finalizeOnboarding = async () => {
    const cause = selectedCause !== null ? CAUSES[selectedCause].name : null;
    const guideInfo = getGuideInfo();

    // Save all onboarding data
    localStorage.setItem('turtleshell-onboarding', JSON.stringify({
      cause, tier: selectedTier, guide: selectedGuide, guideName: guideInfo.name,
      completedGuide: true, completedAt: new Date().toISOString(),
    }));
    localStorage.setItem('turtleshell-guide', selectedGuide ?? 'cosmos');

    // Create profile. The Apex handler grants the 1000 signup bonus on
    // first completion — must run before Stripe checkout so the webhook's
    // additive logic (balance = existing + tier_shells) finds the bonus.
    try {
      const email = localStorage.getItem('olympus_grid_email') || '';
      const username = (email.split('@')[0] ?? '').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'user-' + Date.now();

      const data = await ogRequest('POST', '/turtleshell/profile', {
        username,
        displayName: username,
        cause: cause || undefined,
        guideAgent: selectedGuide || undefined,
        profilePublic: true,
      }) as any;
      console.log('[🐢 Turtleshell] Profile created:', data);
      if (data?.username) {
        localStorage.setItem('turtleshell_username', data.username);
      }
    } catch (e) {
      console.error('[🐢 Turtleshell] Profile creation failed:', e);
    }

    // Set the active agent and hide others
    if (selectedGuide === 'custom' && customAgent) {
      const customId = customAgent.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const newAgent = {
        id: customId,
        name: customAgent.name,
        description: customAgent.personality || 'Your custom guide',
        icon: customAgent.creature,
        capabilities: ['chat' as const],
        requiredServices: [] as string[],
        systemPrompt: customAgent.personality,
      };
      addAgent(newAgent);
      setActiveAgent(newAgent);
      useChatStore.getState().switchAgent(customId);

      const store = useAgentStore.getState();
      for (const a of store.agents) {
        if (a.id !== customId && !store.hiddenAgentIds.has(a.id)) {
          store.toggleVisibility(a.id);
        }
      }
    } else if (selectedGuide === 'athena') {
      // Athena lives in the cosmos-logos store, not the catalog.
      // Ensure auto-connect runs (clears manual disconnect flag) then activate.
      const { autoConnectAthena, clearAthenaDisconnectFlag } = await import('@/lib/cosmos-logos/auto-connect');
      const { useCosmosLogosStore } = await import('@/lib/cosmos-logos/store');
      clearAthenaDisconnectFlag();
      await autoConnectAthena();
      const cosmosStore = useCosmosLogosStore.getState();
      const athena = cosmosStore.agents.find(a => a.manifest.identity.codename === 'athena-616');
      if (athena) {
        cosmosStore.setActiveChatAgent(athena.id);
        useChatStore.getState().switchAgent(athena.id);
        // Hide every builtin catalog agent (Logos, Cosmos, BYOK) — Athena is
        // the only agent the user chose, so the sidebar should only show
        // her. Matches the symmetry of the other guide branches below,
        // which hide non-selected builtins.
        const store = useAgentStore.getState();
        for (const a of store.agents) {
          if (!store.hiddenAgentIds.has(a.id)) {
            store.toggleVisibility(a.id);
          }
        }
      } else {
        console.warn('[Onboarding] Athena auto-connect failed — falling back to Logos');
        const logos = agents.find(a => a.id === 'logos');
        if (logos) { setActiveAgent(logos); useChatStore.getState().switchAgent('logos'); }
      }
    } else if (selectedGuide) {
      const builtinAgent = agents.find(a => a.id === selectedGuide);
      if (builtinAgent) setActiveAgent(builtinAgent);
      useChatStore.getState().switchAgent(selectedGuide);

      const store = useAgentStore.getState();
      // Unhide the selected guide (BYOK agents are hidden by default)
      if (store.hiddenAgentIds.has(selectedGuide)) {
        store.toggleVisibility(selectedGuide);
      }
      // Hide all others
      for (const a of store.agents) {
        if (a.id !== selectedGuide && !store.hiddenAgentIds.has(a.id)) {
          store.toggleVisibility(a.id);
        }
      }
    }
  };

  // Free path — persist everything, then drop the user into chat.
  const handleComplete = async () => {
    await finalizeOnboarding();
    navigate('/app/chat', { replace: true });
  };

  // Paid path — persist everything first so the Stripe webhook's additive
  // logic can find the signup bonus, then redirect to Stripe Checkout.
  // success_url/cancel_url both land on /app/chat because the profile is
  // already in good shape either way; subscription state arrives async via
  // webhook once the user completes payment.
  const handleSubscribe = async () => {
    if (!selectedTier || selectedTier === 'enterprise' || selectedTier === 'free') {
      // Enterprise (Contact Us) and free fall back to the normal final screen.
      goTo('final');
      return;
    }
    setSubscribing(true);
    try {
      await finalizeOnboarding();
      const email = localStorage.getItem('olympus_grid_email') || undefined;
      // Success URL: return to the onboarding FINAL screen ("Enter the Ocean")
      // so the user gets the celebratory moment before landing in chat. The
      // query param is read on mount to fast-forward to `step=final`.
      // Cancel URL: drop back in chat — they still have the signup bonus and
      // onboarding side-effects already ran before we redirected.
      const { checkout_url } = await plutusClient.createCheckout(
        getShellId(),
        selectedTier,
        `${window.location.origin}/onboarding?step=final&welcome=${selectedTier}`,
        `${window.location.origin}/app/chat`,
        email,
      );
      window.location.href = checkout_url;
    } catch (err) {
      console.error('[Onboarding] Subscribe failed:', err);
      setSubscribing(false);
      // User still has signup bonus — drop them in the app so they can retry
      // from Settings → Shells. Don't strand them on a broken screen.
      navigate('/app/chat', { replace: true });
    }
  };

  const guideInfo = getGuideInfo();

  // Compute dot index — guide-custom and guide-byok are inline (replace guide-choose dot)
  const dotIndex = (step === 'guide-custom' || step === 'guide-byok')
    ? STEP_ORDER.indexOf('guide-choose')
    : STEP_ORDER.indexOf(step);

  return (
    <div ref={scrollRef} className="fixed inset-0 overflow-y-auto bg-surface-0">
      <Particles />
      <ScrollHint scrollRef={scrollRef} />
      <div className={`transition-all duration-300 ${transitioning ? 'opacity-0 -translate-y-6' : 'opacity-100 translate-y-0'}`}>
        <Dots current={dotIndex} total={TOTAL_DOTS} />
        {step === 'cause' && (
          <CauseScreen onNext={() => goTo('guide-choose')} selectedCause={selectedCause} setSelectedCause={setSelectedCause} />
        )}
        {step === 'guide-choose' && (
          <GuideChooseScreen selected={selectedGuide} onSelect={setSelectedGuide}
            onNext={() => goTo(selectedGuide === 'custom' ? 'guide-custom' : 'guide-dive')}
            onByok={() => goTo('guide-byok')}
            testBetaEnabled={testBetaEnabled} />
        )}
        {step === 'guide-byok' && (
          <ByokScreen selected={selectedGuide} onSelect={setSelectedGuide}
            onNext={() => goTo('guide-dive')}
            onBack={() => goTo('guide-choose')} />
        )}
        {step === 'guide-custom' && (
          <GuideCustomScreen onBack={() => goTo('guide-choose')}
            onComplete={(name, personality, creature) => { setCustomAgent({ name, personality, creature }); goTo('guide-dive'); }} />
        )}
        {step === 'guide-dive' && (
          <GuideDiveScreen guide={guideInfo} onNext={() => goTo('guide-tour')} />
        )}
        {step === 'guide-tour' && (
          <GuideTourScreen guide={guideInfo} onNext={() => goTo('shells')} />
        )}
        {step === 'shells' && (
          <ShellsScreen onNext={() => goTo('tier')} />
        )}
        {step === 'tier' && (
          <TierScreen
            onSubscribe={handleSubscribe}
            onSkip={() => goTo('final')}
            selectedTier={selectedTier}
            setSelectedTier={setSelectedTier}
            subscribing={subscribing}
          />
        )}
        {step === 'final' && (
          <FinalScreen
            guide={guideInfo}
            selectedCause={selectedCause}
            selectedTier={selectedTier}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}
