// Settings → Change Guide
//
// A mini-flow that mirrors the onboarding guide pick (same screens via
// GuideScreens.tsx) but without cause/tier/final. Picking a guide here ADDS
// it to the user's configured set — it never hides the previous guide, so
// the sidebar accumulates agents as the user sets them up.
//
// End state a user can reach through repeated visits: Athena + Cosmos + Logos
// + OpenAI + Claude + Grok + Gemini all configured and selectable from the
// sidebar/picker. Memory and history stay scoped per-agent server-side.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { GuideChooseScreen, ByokScreen } from '@/routes/onboarding/GuideScreens';
import type { GuideKey } from '@/routes/onboarding/OnboardingData';
import { useAgentStore, hasUserApiKey } from '@/lib/store/agent-store';
import { useChatStore } from '@/lib/store/chat-store';
import {
  useConfiguredGuidesStore,
  markGuideConfigured,
} from '@/lib/store/configured-guides-store';

type Step = 'choose' | 'byok';

export function ChangeGuide() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('choose');
  const [selected, setSelected] = useState<GuideKey | null>(null);

  // Subscribe so the "Active" badge updates live as the user confirms new
  // providers. Direct `.getState()` would freeze at mount.
  const configuredList = useConfiguredGuidesStore((s) => s.configured);
  const configuredIds = useMemo(() => new Set(configuredList), [configuredList]);

  const activate = async (guide: GuideKey) => {
    if (guide === 'custom') return; // Soon — blocked in the picker anyway
    markGuideConfigured(guide);

    // hiddenAgentIds is used elsewhere to hide non-selected agents during
    // initial onboarding. Clear this guide out of that set so the sidebar
    // starts showing it once we've added it to the configured list.
    const agentStore = useAgentStore.getState();
    if (agentStore.hiddenAgentIds.has(guide)) {
      agentStore.toggleVisibility(guide);
    }

    if (guide === 'athena' || guide === 'cosmos' || guide === 'logos') {
      // All three cosmos-logos agents are already auto-connected on boot
      // (see hooks/useStartupRefresh.ts). We just need to pick the active
      // one. Re-running auto-connect is idempotent and also clears the
      // per-guide "disconnected" flag if the user had previously removed it.
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
        // Also unhide the cosmos-logos instance (by its id, which equals
        // codename for bundled agents) in case legacy state hid it.
        if (agentStore.hiddenAgentIds.has(connected.id)) {
          agentStore.toggleVisibility(connected.id);
        }
        cosmosStore.setActiveChatAgent(connected.id);
        useChatStore.getState().switchAgent(connected.id);
      }
    } else {
      // BYOK path. Key was already saved by ByokScreen before navigating
      // here. Clear any cosmos-logos active agent so the picker/header fall
      // through to the builtin.
      const { useCosmosLogosStore } = await import('@/lib/cosmos-logos/store');
      useCosmosLogosStore.getState().setActiveChatAgent(null);

      const builtin = agentStore.agents.find((a) => a.id === guide);
      if (builtin) agentStore.setActiveAgent(builtin);
      useChatStore.getState().switchAgent(guide);
    }

    navigate('/app/chat', { replace: true });
  };

  const handleNext = () => {
    if (!selected) return;
    if (selected === 'custom') return;

    // Already-configured guides skip the BYOK entry step — the user has a
    // saved key (for BYOK) or the cosmos-logos agent is already connected.
    // Just re-activate.
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
        <GuideChooseScreen
          title="Change Your Guide"
          subtitle="Pick one to activate. Previously set-up guides stay in your sidebar."
          selected={selected}
          onSelect={setSelected}
          onNext={handleNext}
          onByok={() => setStep('byok')}
          configuredIds={configuredIds}
          primaryLabel="Activate This Guide"
          byokLabel="Bring your own API key →"
        />
      )}

      {step === 'byok' && (
        <ByokScreen
          selected={selected}
          onSelect={setSelected}
          onNext={() => { if (selected) void activate(selected); }}
          onBack={() => setStep('choose')}
          configuredIds={configuredIds}
          title="Bring Your Own Key"
          subtitle="Add a provider. Your previous guides stay active."
          primaryLabel="Activate This Guide"
        />
      )}
    </div>
  );
}
