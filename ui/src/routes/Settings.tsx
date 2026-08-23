import { useState } from 'react';
import { Info, Sun, Moon, Wrench, Compass, Plus, Sliders, Brain } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { useChatStore } from '@/lib/store/chat-store';
import { useThemeStore } from '@/lib/store/theme-store';
import { useAgentThemeStore, type AgentTheme } from '@/lib/store/agent-theme-store';
import { useChatPreferencesStore } from '@/lib/store/chat-preferences-store';
import { useAllowDeveloperMode } from '@/lib/hooks/useAllowDeveloperMode';
import { useConfiguredGuidesStore } from '@/lib/store/configured-guides-store';
import { useAgentStore, hasUserApiKey } from '@/lib/store/agent-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { AgentSettingsSheet } from '@/components/settings/AgentSettingsSheet';
import { AddAgentModal } from '@/components/settings/AddAgentModal';
import { GUIDES, BYOK_GUIDES } from '@/routes/onboarding/OnboardingData';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-shell-500' : 'bg-surface-3'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

// ── Your Guides section ────────────────────────────────
// Every configured guide renders as its own equal card. No hero/subordinate
// hierarchy — the user's guides are independent relationships, each with
// their own memory and voice. The currently-active one has a pulsing dot;
// the rest are quiet until clicked. Clicking a card activates that guide
// (both cosmos-logos active-agent and chat-store thread) and drops into
// /app/chat so the user resumes with that guide's last conversation.
//
// A dedicated "Add another guide" row sits at the bottom, leading into the
// warm Change Guide flow (Settings → /app/settings/change-guide).
function GuideSection() {
  const navigate = useNavigate();
  const configuredList = useConfiguredGuidesStore((s) => s.configured);
  const activeChatAgentId = useCosmosLogosStore((s) => s.activeChatAgentId);
  const cosmosAgents = useCosmosLogosStore((s) => s.agents);
  const setActiveChatAgent = useCosmosLogosStore((s) => s.setActiveChatAgent);
  const builtinAgents = useAgentStore((s) => s.agents);
  const setActiveAgent = useAgentStore((s) => s.setActiveAgent);
  const builtinActive = useAgentStore((s) => s.activeAgent);
  const switchAgent = useChatStore((s) => s.switchAgent);
  const clusterLabel = useEnvironmentStore((s) => s.current);

  // Per-agent credential manager modal state. Only one open at a time.
  // Steward 2026-07-09: sovereignty is agent-anchored — credentials live
  // on the agent card, not in a global "Sovereign AI" section.
  const [managingAgent, setManagingAgent] = useState<{
    name: string;
    chatManifestUrl?: string;
    voiceManifestUrl?: string;
  } | null>(null);
  const [addAgentOpen, setAddAgentOpen] = useState(false);

  type GuideCard = {
    key: string;
    emoji: string;
    name: string;
    role: string;
    isActive: boolean;
    onActivate: () => void;
    /** Manifest URL for chat capability. When present, "Chat providers"
     *  is offered in this agent's settings sheet. */
    chatManifestUrl?: string;
    /** Manifest URL for voice capability (usually the paired Apollo at
     *  the same cluster). When present, "Voice providers" is offered. */
    voiceManifestUrl?: string;
  };

  const cards: GuideCard[] = configuredList
    .map((key): GuideCard | null => {
      if (key === 'athena' || key === 'cosmos' || key === 'logos') {
        const info = GUIDES[key];
        // Take the first cosmos-logos agent whose codename starts with the
        // family key (athena/cosmos/logos). This lets a user-added
        // Athena-family agent (e.g. `athena-717`) map through the same
        // curated card slot when Athena is the family they configured.
        const cosmos = cosmosAgents.find((a) => {
          const cn = a.manifest.identity.codename;
          return key === 'athena'
            ? (cn === 'athena-616' || cn.startsWith('athena'))
            : cn === key;
        });
        const activeCodename = activeChatAgentId
          ? cosmosAgents.find((a) => a.id === activeChatAgentId)?.manifest.identity.codename
          : null;
        const isActive = !!activeCodename && (
          key === 'athena'
            ? activeCodename.startsWith('athena')
            : activeCodename === key
        );
        // Manifest URLs for this agent's credential silos. Chat targets
        // this agent's Athena directly. Voice pairs with the Apollo at
        // the same cluster (derived by string-swap on the base URL).
        // Steward's launch scope: one chat agent + its paired Apollo.
        // Future: separate agents per capability (Your Sound = Apollo
        // is a peer agent, not a derivative of Athena).
        const agentBase = cosmos?.url;
        const chatManifestUrl = agentBase
          ? `${agentBase}/.well-known/cosmos-logos.json`
          : undefined;
        const voiceManifestUrl = agentBase
          ? `${agentBase.replace('/v1/athena', '/v1/apollo')}/.well-known/cosmos-logos.json`
          : undefined;
        return {
          key,
          emoji: info.emoji,
          name: info.name,
          role: info.role,
          isActive,
          onActivate: () => {
            if (cosmos) {
              setActiveChatAgent(cosmos.id);
              switchAgent(cosmos.id);
              navigate('/app/chat');
            }
          },
          chatManifestUrl,
          voiceManifestUrl,
        };
      }
      if (['openai', 'claude', 'grok', 'gemini'].includes(key)) {
        const info = BYOK_GUIDES[key];
        if (!info || !hasUserApiKey(key)) return null;
        const builtin = builtinAgents.find((a) => a.id === key);
        const isActive = !activeChatAgentId && builtinActive.id === key;
        // BYOK guides talk directly to the provider — they don't route
        // through a cosmos-logos agent, so there's no manifest URL and
        // no sovereign silo to manage here (the plaintext-key flow lives
        // in the Agents route). No settings gear rendered.
        return {
          key,
          emoji: info.emoji,
          name: info.name,
          role: info.role,
          isActive,
          onActivate: () => {
            setActiveChatAgent(null);
            if (builtin) setActiveAgent(builtin);
            switchAgent(key);
            navigate('/app/chat');
          },
        };
      }
      return null;
    })
    .filter((x): x is GuideCard => x !== null);

  // ── Add cards for user-added cosmos-logos agents ──────────────
  // Any cosmos-logos agent whose codename doesn't map to the curated
  // athena/cosmos/logos family gets its own card. Steward 2026-07-09:
  // this is where "Add another agent" pastes land — the agent is stored
  // in cosmos-logos-store but doesn't fit the guide-family keys, so we
  // render it directly.
  const familyCodenames = new Set<string>();
  for (const c of cards) {
    // Track the codenames the curated cards already picked up so we
    // don't render them twice.
    if (c.key === 'athena' || c.key === 'cosmos' || c.key === 'logos') {
      const cosmos = cosmosAgents.find((a) => {
        const cn = a.manifest.identity.codename;
        return c.key === 'athena'
          ? cn.startsWith('athena')
          : cn === c.key;
      });
      if (cosmos) familyCodenames.add(cosmos.manifest.identity.codename);
    }
  }
  for (const agent of cosmosAgents) {
    if (familyCodenames.has(agent.manifest.identity.codename)) continue;
    // Skip background services (poseidon, apollo — those live in future
    // "Your MCP Servers" and "Your Sound" sections).
    if (agent.manifest.display?.visible === false) continue;
    const codename = agent.manifest.identity.codename;
    // Skip apollo-family too (visible: false in most manifests but be defensive)
    if (codename === 'apollo' || codename.startsWith('apollo-')) continue;
    if (codename === 'poseidon' || codename.startsWith('poseidon-')) continue;

    const isActive = activeChatAgentId === agent.id;
    const chatManifestUrl = `${agent.url}/.well-known/cosmos-logos.json`;
    const voiceManifestUrl = `${agent.url.replace('/v1/athena', '/v1/apollo')}/.well-known/cosmos-logos.json`;
    cards.push({
      key: `cosmos:${agent.id}`,
      emoji: '🌀',
      name: agent.displayName ?? agent.manifest.identity.name ?? codename,
      role: codename,
      isActive,
      onActivate: () => {
        setActiveChatAgent(agent.id);
        switchAgent(agent.id);
        navigate('/app/chat');
      },
      chatManifestUrl,
      voiceManifestUrl,
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
        <Compass size={14} /> Your Agents
      </h2>

      {cards.length === 0 && (
        <Link
          to="/app/settings/change-guide"
          className="block p-4 bg-surface-1 border border-border-muted rounded-xl hover:border-shell-500/40 transition-colors text-center"
        >
          <div className="text-sm font-semibold text-text-primary">Pick your first agent</div>
          <div className="text-2xs text-text-muted mt-1">
            Choose a voice to walk with you through the ocean.
          </div>
        </Link>
      )}

      {cards.length > 0 && (
        <div className="space-y-2">
          {cards.map((it) => {
            const hasSovereign = !!it.chatManifestUrl || !!it.voiceManifestUrl;
            return (
              <div
                key={it.key}
                className={`w-full flex items-center gap-3 p-4 rounded-xl bg-surface-1 border transition-all ${
                  it.isActive
                    ? 'border-shell-500/40 bg-shell-500/5'
                    : 'border-border-muted hover:border-shell-500/30'
                }`}
              >
                <button
                  type="button"
                  onClick={it.onActivate}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-xl shrink-0">
                    {it.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${it.isActive ? 'text-shell-400' : 'text-text-primary'}`}>
                      {it.name}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-text-muted">{it.role}</div>
                  </div>
                  {it.isActive ? (
                    <div className="flex items-center gap-1.5 text-xs text-shell-400 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-shell-400 animate-pulse" />Active
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted shrink-0">Switch →</div>
                  )}
                </button>
                {/* Sovereign credential manager gear. Steward 2026-07-09:
                    credentials belong to the agent, not to a global section. */}
                {hasSovereign && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setManagingAgent({
                        name: it.name,
                        chatManifestUrl: it.chatManifestUrl,
                        voiceManifestUrl: it.voiceManifestUrl,
                      });
                    }}
                    className="p-2 rounded-lg text-text-muted hover:text-shell-300 hover:bg-shell-500/10 transition-colors shrink-0"
                    title={`Manage ${it.name}'s credentials`}
                    aria-label={`Manage ${it.name}'s credentials`}
                  >
                    <Sliders size={16} />
                  </button>
                )}
              </div>
            );
          })}

          {/* "Add another agent" — Steward 2026-07-09: un-gated. Paste a
              cosmos-logos manifest URL; the modal handshakes with it and
              adds it as a new agent with its own sovereign silo. */}
          <button
            type="button"
            onClick={() => setAddAgentOpen(true)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-surface-1 border border-dashed border-border-muted text-text-secondary hover:border-shell-500/40 hover:text-shell-300 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-surface-2 border border-dashed border-border-muted flex items-center justify-center shrink-0">
              <Plus size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Add another agent</div>
              <div className="text-2xs mt-0.5">
                Paste any cosmos-logos manifest URL. The agent's pubkey becomes
                its own sovereign credential silo.
              </div>
            </div>
          </button>
        </div>
      )}

      {managingAgent && (
        <AgentSettingsSheet
          agentName={managingAgent.name}
          chatManifestUrl={managingAgent.chatManifestUrl}
          voiceManifestUrl={managingAgent.voiceManifestUrl}
          scopeSuffix={`on ${clusterLabel}`}
          open={true}
          onClose={() => setManagingAgent(null)}
        />
      )}

      <AddAgentModal
        open={addAgentOpen}
        onClose={() => setAddAgentOpen(false)}
        onAdded={(agentId) => {
          // After adding, auto-open the credential manager so the user can
          // configure providers for the new agent immediately.
          const added = cosmosAgents.find((a) => a.id === agentId)
            ?? useCosmosLogosStore.getState().agents.find((a) => a.id === agentId);
          if (added) {
            const chatManifestUrl = `${added.url}/.well-known/cosmos-logos.json`;
            const voiceManifestUrl = `${added.url.replace('/v1/athena', '/v1/apollo')}/.well-known/cosmos-logos.json`;
            setManagingAgent({
              name: added.displayName ?? added.manifest.identity.name ?? added.manifest.identity.codename,
              chatManifestUrl,
              voiceManifestUrl,
            });
          }
        }}
      />
    </section>
  );
}


const AGENT_THEMES: { value: AgentTheme; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'olympus', label: 'Olympus' },
];

function AgentThemeSelector() {
  const { agentTheme, setAgentTheme } = useAgentThemeStore();
  return (
    <div className="pt-3 border-t border-border-muted">
      <div className="text-sm font-semibold mb-1">Agent Theme</div>
      <div className="text-2xs text-text-muted mb-3">Controls agent avatars in chat, sidebar, and picker</div>
      <div className="flex gap-1 bg-surface-2 p-1 rounded-lg">
        {AGENT_THEMES.map(t => (
          <button
            key={t.value}
            onClick={() => setAgentTheme(t.value)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
              agentTheme === t.value
                ? 'bg-shell-500 text-white shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Settings — minimal MVP surface. Three top-level toggles ordered
 * Appearance → Memory → Developer. Everything else (beta features,
 * agent avatars, agent theme, future dev tools) lives *inside* the
 * Developer section, revealed only when Developer Mode is ON. The
 * Developer Mode toggle itself stays at the top of that panel so it
 * never vanishes when the rest expands.
 */
export function Settings() {
  const { developerMode, setDeveloperMode, testBetaEnabled, setTestBetaEnabled } = useEnvironmentStore();
  // Server-gated: when TurtleshellProfile__c.AllowDeveloperMode__c is false,
  // the entire Developer section is hidden and both local flags
  // (developerMode, testBetaEnabled) are force-reverted. Null while the
  // profile GET is in flight — treat as disabled to avoid flashing dev UI.
  const allowDeveloperMode = useAllowDeveloperMode();

  const { theme, setTheme } = useThemeStore();
  const { memoryEnabled, setMemoryEnabled } = useChatStore();
  const { showAgentAvatars, setShowAgentAvatars } = useChatPreferencesStore();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure your TurtleShell.ai experience.
          </p>
        </div>

        <GuideSection />

        {/* Appearance — Dark Mode toggle only. First visible knob. */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />} Appearance
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Dark Mode</div>
                <div className="text-2xs text-text-muted mt-0.5">
                  Switch between light and dark theme
                </div>
              </div>
              <Toggle on={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
            </div>
          </div>
        </section>

        {/* Memory — second top-level knob. */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Brain size={14} /> Memory
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Memory</div>
                <div className="text-2xs text-text-muted mt-0.5">
                  Remember conversation context within a session
                </div>
              </div>
              <Toggle on={memoryEnabled} onToggle={() => setMemoryEnabled(!memoryEnabled)} />
            </div>
            {!memoryEnabled && (
              <div className="mt-3 text-2xs text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/10 rounded-lg px-3 py-2">
                Memory is disabled. Conversations are fully stateless.
              </div>
            )}
          </div>
        </section>

        {/* Developer — last top-level section. The Developer Mode toggle
            is the anchor at the top of this panel. When it's ON, every
            other advanced knob (Test Beta, Agent Avatars, Agent Theme,
            future dev tools) reveals *below* the toggle, never above.
            Entire section is server-gated on AllowDeveloperMode__c — the
            admin can hide this surface for any user (App Store review
            default). See useAllowDeveloperMode for the reconcile rules. */}
        {allowDeveloperMode === true && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Wrench size={14} /> Developer
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-4">
            {/* Toggle stays pinned at the top of the panel. */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Developer Mode</div>
                <div className="text-2xs text-text-muted mt-0.5">
                  Debug info and developer tools.
                </div>
              </div>
              <Toggle on={developerMode} onToggle={() => setDeveloperMode(!developerMode)} />
            </div>

            {developerMode && (
              <>
                {/* Test Beta Features — early-access advanced UI. */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border-muted">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">Test Beta Features</div>
                    <div className="text-2xs text-text-muted mt-0.5">
                      Show the full UI.
                    </div>
                  </div>
                  <Toggle on={testBetaEnabled} onToggle={() => setTestBetaEnabled(!testBetaEnabled)} />
                </div>

                {/* Agent Avatars — controls chat + sidebar avatar rendering.
                    Previously lived in its own "Chat" section; moved here
                    because it's a power-user knob that only makes sense
                    once Developer Mode reveals the theme system. */}
                <div className="pt-3 border-t border-border-muted">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Agent Avatars</div>
                      <div className="text-2xs text-text-muted mt-0.5">
                        Show agent emoji next to messages in chat
                      </div>
                    </div>
                    <Toggle on={showAgentAvatars} onToggle={() => setShowAgentAvatars(!showAgentAvatars)} />
                  </div>
                  {showAgentAvatars && <AgentThemeSelector />}
                </div>
              </>
            )}
          </div>
        </section>
        )}

        {/* About — version, platform, license inline (never hidden). */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Info size={14} /> About
          </h2>
          <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Version</span>
              <span className="font-mono text-text-secondary">1.7.4</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Platform</span>
              <span className="text-text-secondary">Web</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">License</span>
              <span className="text-text-secondary">AGPL-3.0</span>
            </div>
            <div className="pt-2 border-t border-border-muted text-2xs text-text-muted">
              &copy; 2026 CloudPremise LLC. All rights reserved.
            </div>
          </div>
        </section>

        {/* Legal Links */}
        <section className="flex items-center gap-4 text-xs text-text-muted">
          <a href="/terms" className="hover:text-text-secondary transition-colors">
            Terms &amp; Conditions
          </a>
          <span>·</span>
          <a href="/privacy" className="hover:text-text-secondary transition-colors">
            Privacy Policy
          </a>
          <span>·</span>
          <a href="/security" className="hover:text-text-secondary transition-colors">
            Security
          </a>
        </section>
      </div>
    </div>
  );
}
