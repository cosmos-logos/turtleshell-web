// Settings → Change Guide
//
// The warm mid-flow for swapping or adding a guide. Mirrors the onboarding
// picker but with an explicit "meet them" confirmation step so the user
// understands — before anything changes — that their current guide and
// everything said to them stays exactly where it was. Each guide has their
// own memory; switching is like opening a different notebook. Nothing is
// lost, and they can come back from the sidebar or the dropdown up top any
// time.
//
// Copy is written for a user who doesn't speak tech but can feel when
// software respects them.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { GuideChooseScreen, ByokScreen, GuideBtn } from '@/routes/onboarding/GuideScreens';
import { GUIDES, BYOK_GUIDES, type GuideKey } from '@/routes/onboarding/OnboardingData';
import { useAgentStore, hasUserApiKey } from '@/lib/store/agent-store';
import { useChatStore } from '@/lib/store/chat-store';
import {
  useConfiguredGuidesStore,
  markGuideConfigured,
} from '@/lib/store/configured-guides-store';

type Step = 'choose' | 'confirm' | 'byok';

function guideInfo(key: GuideKey): { emoji: string; name: string; role: string } {
  if (key in GUIDES) return GUIDES[key as keyof typeof GUIDES];
  const byok = BYOK_GUIDES[key];
  if (byok) return byok;
  return { emoji: '✨', name: String(key), role: 'Your Guide' };
}

export function ChangeGuide() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('choose');
  const [selected, setSelected] = useState<GuideKey | null>(null);

  const configuredList = useConfiguredGuidesStore((s) => s.configured);
  const configuredIds = useMemo(() => new Set(configuredList), [configuredList]);

  const activate = async (guide: GuideKey) => {
    if (guide === 'custom') return;
    markGuideConfigured(guide);

    const agentStore = useAgentStore.getState();
    if (agentStore.hiddenAgentIds.has(guide)) {
      agentStore.toggleVisibility(guide);
    }

    if (guide === 'athena' || guide === 'cosmos' || guide === 'logos') {
      const autoConnect = await import('@/lib/cosmos-logos/auto-connect');
      const { useCosmosLogosStore } = await import('@/lib/cosmos-logos/store');
      const matchCodename = guide === 'athena' ? 'athena-616' : guide;

      if (guide === 'athena') {
        autoConnect.clearAthenaDisconnectFlag();
        await autoConnect.autoConnectAthena();
      } else if (guide === 'cosmos') {
        autoConnect.clearCosmosDisconnectFlag();
        await autoConnect.autoConnectCosmos();
      } else {
        autoConnect.clearLogosDisconnectFlag();
        await autoConnect.autoConnectLogos();
      }

      const cosmosStore = useCosmosLogosStore.getState();
      const connected = cosmosStore.agents.find((a) => a.manifest.identity.codename === matchCodename);
      if (connected) {
        if (agentStore.hiddenAgentIds.has(connected.id)) {
          agentStore.toggleVisibility(connected.id);
        }
        cosmosStore.setActiveChatAgent(connected.id);
        useChatStore.getState().switchAgent(connected.id);
      }
    } else {
      const { useCosmosLogosStore } = await import('@/lib/cosmos-logos/store');
      useCosmosLogosStore.getState().setActiveChatAgent(null);

      const builtin = agentStore.agents.find((a) => a.id === guide);
      if (builtin) agentStore.setActiveAgent(builtin);
      useChatStore.getState().switchAgent(guide);
    }

    navigate('/app/chat', { replace: true });
  };

  // Picker → confirmation (unless custom/Soon).
  const handleNext = () => {
    if (!selected) return;
    if (selected === 'custom') return;
    setStep('confirm');
  };

  // Confirmation → activate (with BYOK key step if the provider needs one).
  const handleConfirm = () => {
    if (!selected) return;
    if (configuredIds.has(selected)) {
      void activate(selected);
      return;
    }
    const isBYOK = ['openai', 'claude', 'grok', 'gemini'].includes(selected);
    if (isBYOK && !hasUserApiKey(selected)) {
      setStep('byok');
      return;
    }
    void activate(selected);
  };

  return (
    <div className="max-w-2xl mx-auto pt-12 pb-24 px-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors mb-4"
      >
        <ChevronLeft size={14} />
        Back to Settings
      </button>

      {step === 'choose' && (
        <>
          <IntroBlurb />
          <GuideChooseScreen
            title="Meet a new guide"
            subtitle="Each guide has their own voice — and their own memory."
            selected={selected}
            onSelect={setSelected}
            onNext={handleNext}
            onByok={() => setStep('byok')}
            configuredIds={configuredIds}
            primaryLabel="Tell me about them"
            byokLabel="Bring your own API key →"
          />
        </>
      )}

      {step === 'confirm' && selected && (
        <ConfirmScreen
          selected={selected}
          onConfirm={handleConfirm}
          onBack={() => setStep('choose')}
        />
      )}

      {step === 'byok' && (
        <ByokScreen
          selected={selected}
          onSelect={setSelected}
          onNext={() => { if (selected) void activate(selected); }}
          onBack={() => setStep(selected ? 'confirm' : 'choose')}
          configuredIds={configuredIds}
          title="Bring your own key"
          subtitle="One last step. Paste your API key and you'll be ready."
          primaryLabel="That's my key"
        />
      )}
    </div>
  );
}

// ── Intro above the picker ─────────────────────────────
// Sets expectations BEFORE the user picks so they know the switch is safe,
// reversible, and doesn't collapse what they've built with anyone else.
function IntroBlurb() {
  return (
    <div className="mb-10 space-y-4">
      <h1 className="text-3xl font-bold text-text-primary leading-tight">
        Your guide, your choice.
      </h1>
      <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
        <p>
          Guides are the voices you speak with. You can keep as many as you want,
          and each one has their own memory — like a friend who remembers only
          the conversations the two of you have had.
        </p>
        <p>
          Pick a guide below. Nothing you've shared with anyone else goes anywhere.
          You can switch back to any guide from the menu on the left or the
          dropdown at the top — everything they remember will be right where
          you left it.
        </p>
      </div>
    </div>
  );
}

// ── Confirmation screen ────────────────────────────────
// The "meet them" moment. Makes the promise explicit so the user can proceed
// calmly: each guide keeps their own memory, the current one stays intact,
// they can return any time. Warm, plain language — written for someone who
// can feel the difference between respectful and robotic software.
function ConfirmScreen({
  selected,
  onConfirm,
  onBack,
}: {
  selected: GuideKey;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const info = guideInfo(selected);
  const isByok = ['openai', 'claude', 'grok', 'gemini'].includes(selected);

  return (
    <div className="flex flex-col items-center min-h-[80vh] justify-center pt-8 pb-12 text-center px-4">
      <div className="w-28 h-28 rounded-full bg-surface-2 border-2 border-shell-500/40 flex items-center justify-center text-6xl mb-5 shadow-lg shadow-shell-500/10">
        {info.emoji}
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-1">
        Meet {info.name}
      </h1>
      <p className="text-xs uppercase tracking-wider text-text-muted mb-7">{info.role}</p>

      <div className="max-w-[420px] space-y-4 text-sm text-text-secondary leading-relaxed mb-8">
        <p>
          {info.name} has their own memory. Anything you share here — your stories,
          your hopes, what matters — stays with {info.name}. Nothing you've told
          your other guides moves over.
        </p>
        <p>
          And you're not leaving anyone behind. Your current guide is still here,
          remembering exactly what you told them. Switch back any time from the
          menu on the left or the dropdown at the top.
        </p>
        {isByok && (
          <p className="text-xs text-shell-400 bg-shell-500/5 border border-shell-500/20 rounded-lg px-4 py-3">
            {info.name} runs on your own API key, which you'll paste on the next
            screen. Your key stays in your browser — it doesn't touch our servers.
          </p>
        )}
      </div>

      <div className="w-full max-w-[320px] space-y-3">
        <GuideBtn onClick={onConfirm}>
          {isByok ? `Yes, add my key` : `Yes, say hi to ${info.name}`}
        </GuideBtn>
        <GuideBtn variant="ghost" onClick={onBack}>
          Pick a different guide
        </GuideBtn>
      </div>
    </div>
  );
}
