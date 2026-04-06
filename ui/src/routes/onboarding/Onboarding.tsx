import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CAUSES, TIERS, PERKS, type GuideKey, type CauseIndex } from './OnboardingData';
import { ogRequest } from '@/lib/api/olympus-grid-client';

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
    <div className="fixed top-8 left-1/2 -translate-x-1/2 flex gap-[7px] z-20">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 h-[7px] ${
          i === current ? 'w-6 bg-shell-500' : i < current ? 'w-[7px] bg-white/15' : 'w-[7px] bg-white/10'
        }`} />
      ))}
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

// ── Screen 1: Choose Your Cause ────────────────────────
function CauseScreen({ onNext, selectedCause, setSelectedCause }: {
  onNext: () => void; selectedCause: CauseIndex | null; setSelectedCause: (c: CauseIndex) => void;
}) {
  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center text-center px-4">
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

// ── Screen 2: Shells Arrive ────────────────────────────
function ShellsScreen({ onNext }: { onNext: () => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (count >= 1000) return;
    const t = setTimeout(() => setCount(c => Math.min(c + 28, 1000)), 18);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center text-center px-4">
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

// ── Screen 3: Counter Preview ──────────────────────────
function CounterScreen({ onNext, selectedCause }: { onNext: () => void; selectedCause: CauseIndex | null }) {
  const cause = selectedCause !== null ? CAUSES[selectedCause] : CAUSES[0];
  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center text-center px-4">
      <h1 className="text-2xl font-bold mb-2 text-text-primary">Your Ocean Identity</h1>
      <p className="text-sm mb-5 text-text-muted">Every turn spent, your giving grows. This number never goes down.</p>

      <div className="w-full max-w-[320px] rounded-xl p-5 text-center mb-5 bg-surface-1 border border-border-muted">
        <span className="text-[44px] block mb-2.5">{cause.emoji}</span>
        <div className="text-base font-semibold text-text-primary mb-1">{cause.name}</div>
        <div className="text-sm leading-relaxed text-text-muted">{cause.desc}</div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center w-full max-w-[320px] mb-6">
        <div className="rounded-xl p-4 text-center bg-surface-1 border border-border-muted">
          <div className="text-2xl font-bold leading-none mb-1 text-amber-200">1,000</div>
          <div className="text-[10px] tracking-widest uppercase text-text-muted">🐚 shells</div>
        </div>
        <div className="text-xl text-text-muted/30">→</div>
        <div className="rounded-xl p-4 text-center bg-surface-1 border border-border-muted">
          <div className="text-2xl font-bold leading-none mb-1 text-shell-400">0</div>
          <div className="text-[10px] tracking-widest uppercase text-text-muted">{cause.label}</div>
        </div>
      </div>

      <p className="text-sm text-center max-w-[280px] leading-relaxed font-light mb-8 text-text-muted">
        Use Athena 100 times →<br /><span className="font-bold text-shell-400">70 shells flow to your cause.</span><br />Spending feels like giving.
      </p>
      <Btn onClick={onNext}>I Understand</Btn>
    </div>
  );
}

// ── Screen 4: Choose Your Tide ─────────────────────────
function TierScreen({ onNext, selectedTier, setSelectedTier }: {
  onNext: () => void; selectedTier: string | null; setSelectedTier: (t: string) => void;
}) {
  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center text-center px-4">
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
        <Btn onClick={onNext} disabled={!selectedTier}>
          {selectedTier === 'enterprise' ? 'Contact Us' : selectedTier ? `Subscribe · ${TIERS.find(t => t.id === selectedTier)?.price ?? ''}/mo` : 'Start My Subscription'}
        </Btn>
        <Btn variant="ghost" onClick={onNext}>Start with my free shells first</Btn>
      </div>
    </div>
  );
}

// ── Screen 5: Enter the Ocean ──────────────────────────
function FinalScreen({ selectedCause, onComplete }: { selectedCause: CauseIndex | null; onComplete: () => void }) {
  const cause = selectedCause !== null ? CAUSES[selectedCause] : CAUSES[0];
  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center text-center px-4">
      <div className="relative w-[180px] h-[180px] mb-7">
        {[0, 1, 2].map(i => (
          <div key={i} className="absolute inset-0 rounded-full border border-shell-500/20" style={{
            animation: `ocean-wave 3s ease-out infinite`, animationDelay: `${i}s`,
          }} />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[72px]" style={{ animation: 'ocean-creature 3.5s ease-in-out infinite' }}>🐢</span>
        </div>
      </div>
      <h1 className="text-3xl font-bold mb-3 text-text-primary">The Ocean Is Yours</h1>
      <p className="text-sm font-light text-center max-w-[280px] leading-relaxed mb-3 text-text-muted">
        Your AI is sovereign.<br />Your keys never leave your device.<br />Your cause is chosen.
      </p>
      <p className="text-sm italic text-center max-w-[260px] leading-relaxed mb-9 text-amber-400">{cause.pledge}</p>
      <button onClick={onComplete}
        className="w-full max-w-[320px] py-3.5 px-6 rounded-xl text-base font-semibold transition-all hover:-translate-y-px active:translate-y-0 bg-gradient-to-r from-shell-500 to-amber-500 text-white">
        Enter the Ocean
      </button>
      <div className="mt-4 text-[11px] tracking-widest uppercase text-text-muted">Your sovereign AI begins now</div>
    </div>
  );
}

// ── Main Onboarding Component ──────────────────────────
export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedCause, setSelectedCause] = useState<CauseIndex | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedGuide] = useState<GuideKey | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const goNext = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => { setStep(s => s + 1); setTransitioning(false); }, 300);
  }, []);

  const handleComplete = async () => {
    const cause = selectedCause !== null ? CAUSES[selectedCause].name : null;
    const guide = selectedGuide;

    localStorage.setItem('turtleshell-onboarding', JSON.stringify({
      cause, tier: selectedTier, guide, completedAt: new Date().toISOString(),
    }));

    try {
      const email = localStorage.getItem('olympus_grid_email') || '';
      const username = (email.split('@')[0] ?? '').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'user-' + Date.now();

      const data = await ogRequest('POST', '/turtleshell/profile', {
        username,
        displayName: username,
        cause: cause || undefined,
        guideAgent: guide || undefined,
        profilePublic: true,
      }) as any;
      console.log('[🐢 Turtleshell] Profile created:', data);
      if (data?.username) {
        localStorage.setItem('turtleshell_username', data.username);
      }
    } catch (e) {
      console.error('[🐢 Turtleshell] Profile creation failed:', e);
    }

    navigate('/app/chat');
  };

  const screens = [
    <CauseScreen key={0} onNext={goNext} selectedCause={selectedCause} setSelectedCause={setSelectedCause} />,
    <ShellsScreen key={1} onNext={goNext} />,
    <CounterScreen key={2} onNext={goNext} selectedCause={selectedCause} />,
    <TierScreen key={3} onNext={goNext} selectedTier={selectedTier} setSelectedTier={setSelectedTier} />,
    <FinalScreen key={4} selectedCause={selectedCause} onComplete={handleComplete} />,
  ];

  return (
    <div className="fixed inset-0 overflow-y-auto bg-surface-0">
      <Particles />
      <Dots current={step} total={5} />
      <div className={`transition-all duration-300 ${transitioning ? 'opacity-0 -translate-y-6' : 'opacity-100 translate-y-0'}`}>
        {screens[step]}
      </div>
    </div>
  );
}
