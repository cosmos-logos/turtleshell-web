import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUIDES, CREATURES, type GuideKey } from './OnboardingData';
import { useAgentStore } from '@/lib/store/agent-store';

type Screen = 'choose' | 'custom' | 'dive' | 'tour' | 'ready';

const GUIDE_ENTRIES: { key: GuideKey; style: string; selectedBg: string; selectedBorder: string }[] = [
  { key: 'athena', style: 'text-purple-400', selectedBg: 'bg-purple-500/10', selectedBorder: 'border-purple-500/40' },
  { key: 'cosmos', style: 'text-shell-400', selectedBg: 'bg-shell-500/10', selectedBorder: 'border-shell-500/40' },
  { key: 'logos', style: 'text-teal-400', selectedBg: 'bg-teal-500/10', selectedBorder: 'border-teal-500/40' },
  { key: 'custom', style: 'text-amber-400', selectedBg: 'bg-amber-500/10', selectedBorder: 'border-amber-500/40' },
];

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 flex gap-[7px] z-20">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 h-[7px] ${
          i === current ? 'w-6 bg-shell-500' : i < current ? 'w-[7px] bg-white/15' : 'w-[7px] bg-white/10'
        }`} />
      ))}
    </div>
  );
}

// ── Screen 1: Choose Your Guide ──────────────────────
function ChooseScreen({ selected, onSelect, onNext }: {
  selected: GuideKey | null; onSelect: (k: GuideKey) => void; onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center text-center px-4">
      <h1 className="text-2xl font-bold mb-2 text-text-primary">Choose Your Guide</h1>
      <p className="text-sm mb-7 text-text-muted">Who walks with you through the ocean?</p>

      <div className="flex flex-col gap-3 w-full max-w-[340px] mb-8">
        {GUIDE_ENTRIES.map(({ key, style, selectedBg, selectedBorder }) => {
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

      <button onClick={onNext} disabled={!selected}
        className="w-full max-w-[320px] py-3.5 rounded-xl text-sm font-semibold bg-shell-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-px">
        This Is My Guide
      </button>
    </div>
  );
}

// ── Screen 2: Custom Agent Creation ──────────────────
function CustomScreen({ onBack, onComplete }: {
  onBack: () => void; onComplete: (name: string, personality: string, creature: string) => void;
}) {
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [creature, setCreature] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center text-center px-4">
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
        <button onClick={() => { if (name.trim() && creature) onComplete(name.trim(), personality.trim(), creature); }}
          disabled={!name.trim() || !creature}
          className="w-full py-3.5 rounded-xl text-sm font-semibold bg-shell-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:-translate-y-px">
          Create My Guide
        </button>
        <button onClick={onBack}
          className="w-full py-3.5 rounded-xl text-sm font-medium bg-transparent border border-border-muted text-text-muted hover:text-text-secondary transition-colors">
          Back
        </button>
      </div>
    </div>
  );
}

// ── Screen 3: The Dive ───────────────────────────────
function DiveScreen({ guide, onNext }: {
  guide: { emoji: string; name: string; role: string; greeting: string }; onNext: () => void;
}) {
  const [showGreeting, setShowGreeting] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowGreeting(true), 600); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center text-center px-4">
      <div className="w-28 h-28 rounded-full bg-surface-2 border-2 border-shell-500/30 flex items-center justify-center text-6xl mb-5 shadow-lg shadow-shell-500/10 animate-pulse">
        {guide.emoji}
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-1">{guide.name}</h1>
      <p className="text-xs uppercase tracking-wider text-text-muted mb-6">{guide.role}</p>

      <div className={`text-lg italic leading-relaxed max-w-[300px] text-text-secondary whitespace-pre-line transition-opacity duration-700 mb-10 ${showGreeting ? 'opacity-100' : 'opacity-0'}`}>
        {guide.greeting}
      </div>

      <button onClick={onNext}
        className="w-full max-w-[320px] py-3.5 rounded-xl text-sm font-semibold bg-shell-500 text-white transition-all hover:-translate-y-px">
        I'm ready
      </button>
    </div>
  );
}

// ── Screen 4: Menu Tour ──────────────────────────────
function TourScreen({ guide, onNext }: {
  guide: { emoji: string; name: string; ready: string }; onNext: () => void;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= 7) return;
    const delays = [800, 1400, 2200, 3000, 3800, 4600, 5400];
    const t = setTimeout(() => setStep(s => s + 1), delays[step] ?? 800);
    return () => clearTimeout(t);
  }, [step]);

  const messages: { role: 'guide' | 'user' | 'highlight'; text: string; icon?: string }[] = [
    { role: 'guide', text: 'The ocean has everything you need. Let me show you.' },
    { role: 'highlight', text: 'Agents — your fleet of guides', icon: '🤖' },
    { role: 'guide', text: 'Connect more gods — Poseidon for tools, Apollo for voice — and they appear in your fleet.' },
    { role: 'highlight', text: 'Services — connect your clouds', icon: '🔌' },
    { role: 'guide', text: 'Link Salesforce, GitHub, HubSpot. I can act on your behalf in any of them.' },
    { role: 'highlight', text: 'Sea Shells — your currency', icon: '🐚' },
    { role: 'guide', text: 'Every turn costs one shell. 7% flows to your cause. Your giving grows every time we speak.' },
  ];

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-start pt-20 text-center px-4">
      <h1 className="text-lg font-bold text-text-primary mb-6">Here's your ocean</h1>

      <div className="w-full max-w-[340px] flex flex-col gap-3 mb-8">
        {messages.slice(0, step).map((m, i) => {
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

        {step >= 7 && (
          <>
            <div className="flex justify-end animate-fade-in">
              <div className="bg-shell-500/10 border border-shell-500/20 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-text-secondary">
                I think I'm ready.
              </div>
            </div>
            <div className="flex items-start gap-2.5 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-lg shrink-0">
                {guide.emoji}
              </div>
              <div className="bg-surface-1 border border-border-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-text-secondary text-left max-w-[260px]">
                {guide.ready}
              </div>
            </div>
          </>
        )}
      </div>

      {step >= 7 && (
        <button onClick={onNext}
          className="w-full max-w-[320px] py-3.5 rounded-xl text-sm font-semibold bg-shell-500 text-white transition-all hover:-translate-y-px animate-fade-in">
          Let's Begin
        </button>
      )}
    </div>
  );
}

// ── Screen 5: You're In ──────────────────────────────
function ReadyScreen({ guide, onComplete }: {
  guide: { emoji: string; name: string }; onComplete: () => void;
}) {
  const onboarding = JSON.parse(localStorage.getItem('turtleshell-onboarding') ?? '{}');
  const cause = onboarding.cause ?? 'the ocean';

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center text-center px-4">
      <span className="text-7xl block mb-2 animate-pulse">🐚</span>
      <div className="text-5xl font-bold text-amber-200 mb-1">1,000</div>
      <div className="text-xs tracking-widest uppercase text-text-muted mb-1">Sea Shells Ready</div>
      <div className="text-sm text-shell-400 mb-6">🌊 0 shells given to {cause} so far</div>

      <div className="flex gap-2 flex-wrap justify-center mb-8">
        <span className="text-xs rounded-full px-3 py-1.5 bg-surface-1 border border-border-muted text-text-secondary">
          Guide: <span className="text-text-primary font-medium">{guide.emoji} {guide.name}</span>
        </span>
        <span className="text-xs rounded-full px-3 py-1.5 bg-surface-1 border border-border-muted text-text-secondary">
          Tithe: <span className="text-text-primary font-medium">7% / turn</span>
        </span>
      </div>

      <p className="text-sm text-text-muted leading-relaxed max-w-[280px] mb-8">
        The ocean is sovereign.<br />Your keys never leave your device.<br />Your guide is waiting.
      </p>

      <button onClick={onComplete}
        className="w-full max-w-[320px] py-3.5 rounded-xl text-base font-semibold bg-gradient-to-r from-shell-500 to-amber-500 text-white transition-all hover:-translate-y-px">
        Open the Ocean
      </button>
      <div className="mt-4 text-[11px] tracking-widest uppercase text-text-muted">Your sovereign AI begins now</div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────
export function GuideSelection() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('choose');
  const [selectedGuide, setSelectedGuide] = useState<GuideKey | null>(null);
  const [customAgent, setCustomAgent] = useState<{ name: string; personality: string; creature: string } | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const { setActiveAgent, addAgent, agents } = useAgentStore();

  const goTo = useCallback((s: Screen) => {
    setTransitioning(true);
    setTimeout(() => { setScreen(s); setTransitioning(false); }, 300);
  }, []);

  const getGuideInfo = () => {
    if (selectedGuide === 'custom' && customAgent) {
      return {
        emoji: customAgent.creature,
        name: customAgent.name,
        role: 'Your Agent · Your Identity',
        greeting: `I am ${customAgent.name}.\n${customAgent.personality || 'I am yours.\nTell me what you need\nand I will become it.'}`,
        ready: 'I am ready. What shall we do first?',
      };
    }
    return selectedGuide ? GUIDES[selectedGuide] : GUIDES.cosmos;
  };

  const handleChooseNext = () => {
    if (selectedGuide === 'custom') {
      goTo('custom');
    } else {
      goTo('dive');
    }
  };

  const handleCustomComplete = (name: string, personality: string, creature: string) => {
    setCustomAgent({ name, personality, creature });
    goTo('dive');
  };

  const handleComplete = () => {
    const guide = getGuideInfo();

    // Store guide selection
    const existing = JSON.parse(localStorage.getItem('turtleshell-onboarding') ?? '{}');
    localStorage.setItem('turtleshell-onboarding', JSON.stringify({
      ...existing, guide: selectedGuide, guideName: guide.name, completedGuide: true,
    }));
    localStorage.setItem('turtleshell-guide', selectedGuide ?? 'cosmos');

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

      // Hide all built-in agents
      const store = useAgentStore.getState();
      for (const a of store.agents) {
        if (a.id !== customId && !store.hiddenAgentIds.has(a.id)) {
          store.toggleVisibility(a.id);
        }
      }
    } else if (selectedGuide) {
      const builtinAgent = agents.find(a => a.id === selectedGuide);
      if (builtinAgent) setActiveAgent(builtinAgent);

      // Hide all other built-in agents
      const store = useAgentStore.getState();
      for (const a of store.agents) {
        if (a.id !== selectedGuide && !store.hiddenAgentIds.has(a.id)) {
          store.toggleVisibility(a.id);
        }
      }
    }

    navigate('/app/chat', { replace: true });
  };

  const guideInfo = getGuideInfo();
  const screenIdx = ['choose', 'custom', 'dive', 'tour', 'ready'].indexOf(screen);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-surface-0">
      <Dots current={screenIdx} total={5} />
      <div className={`transition-all duration-300 ${transitioning ? 'opacity-0 -translate-y-6' : 'opacity-100 translate-y-0'}`}>
        {screen === 'choose' && (
          <ChooseScreen selected={selectedGuide} onSelect={setSelectedGuide} onNext={handleChooseNext} />
        )}
        {screen === 'custom' && (
          <CustomScreen onBack={() => goTo('choose')} onComplete={handleCustomComplete} />
        )}
        {screen === 'dive' && (
          <DiveScreen guide={guideInfo} onNext={() => goTo('tour')} />
        )}
        {screen === 'tour' && (
          <TourScreen guide={guideInfo} onNext={() => goTo('ready')} />
        )}
        {screen === 'ready' && (
          <ReadyScreen guide={guideInfo} onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}
