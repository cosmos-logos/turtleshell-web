import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Lock } from 'lucide-react';
import { useNavigate, useMatch, useLocation } from 'react-router-dom';
import { useAgentStore, isAgentAvailable } from '@/lib/store/agent-store';
import { useConfiguredGuidesStore } from '@/lib/store/configured-guides-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { agentDisplayName } from '@/lib/cosmos-logos/types';
import { useChatStore } from '@/lib/store/chat-store';
import { OLYMPUS_AGENTS } from '@/lib/agents/olympus-data';
import { useAgentThemeStore } from '@/lib/store/agent-theme-store';
import {
  useTestBetaEnabled,
  isBuiltinAgentVisibleInBeta,
  isCosmosAgentVisibleInBeta,
  isCosmosCodenameConfigured,
} from '@/lib/beta';
import type { Agent } from '@/types/agent';

const OCEAN_EMOJIS: Record<string, string> = {
  'athena-616': '🐙', 'poseidon-616': '🔱', 'apollo-616': '🐬',
  cosmos: '🐟', logos: '🐢',
};

function resolveEmoji(codename: string, theme: string): string | null {
  if (theme === 'standard') return null;
  if (theme === 'ocean') return OCEAN_EMOJIS[codename] ?? null;
  const o = OLYMPUS_AGENTS.find(a => codename.startsWith(a.codename) || a.codename.startsWith(codename));
  return o?.godEmoji ?? null;
}

interface AgentPickerProps {
  /** Compact mode for mobile — renders inline without the icon orb. */
  compact?: boolean;
}

export function AgentPicker({ compact }: AgentPickerProps) {
  const { activeAgent, setActiveAgent, agents: allBuiltinAgentsRaw, hiddenAgentIds } = useAgentStore();
  const testBetaEnabled = useTestBetaEnabled();
  // Subscribe so picker re-renders when Change Guide marks a new guide
  // configured — the filter functions below read the store via getState and
  // would otherwise show a stale list until the next unrelated re-render.
  useConfiguredGuidesStore((s) => s.configured);
  const cosmosAgentsRaw = useCosmosLogosStore((s) => s.agents);
  const cosmosAgents = cosmosAgentsRaw
    .filter(a => !hiddenAgentIds.has(a.id))
    .filter(a => isCosmosAgentVisibleInBeta(a.manifest.identity.codename, testBetaEnabled))
    // Gate guide-family (athena/cosmos/logos) codenames on configured state
    // so newly signed-up users don't see all three just because autoConnect
    // populated the cosmos-logos store on boot.
    .filter(a => isCosmosCodenameConfigured(a.manifest.identity.codename));
  // Cosmos and Logos ship as both builtin fallbacks AND bundled cosmos-logos
  // manifests; when the cosmos-logos store holds a matching codename, hide
  // the builtin dupe so the picker shows a single row per agent.
  const cosmosCodenames = new Set(cosmosAgentsRaw.map(a => a.manifest.identity.codename));
  const allBuiltinAgents = allBuiltinAgentsRaw
    .filter(a => !hiddenAgentIds.has(a.id))
    .filter(a => isBuiltinAgentVisibleInBeta(a.id, testBetaEnabled))
    .filter(a => !cosmosCodenames.has(a.id));
  const agentTheme = useAgentThemeStore((s) => s.agentTheme);
  const activeChatAgentId = useCosmosLogosStore((s) => s.activeChatAgentId);
  const setActiveChatAgent = useCosmosLogosStore((s) => s.setActiveChatAgent);
  const navigate = useNavigate();
  const agentViewMatch = useMatch('/app/agent/:agentId');
  const location = useLocation();

  /**
   * Routes that scope their content to the active agent (History,
   * Memory, Tools — each reads the agent stores and re-renders when
   * the user picks a different one). When the user picks a new agent
   * from any of these pages, we switch stores but stay on the route
   * so they get that agent's perspective of the same tab. Anywhere
   * else (Settings, Shells, Profile, Docs, etc.) we send them to
   * /app/chat — picking an agent on those pages overwhelmingly
   * means "start talking to this one," not "stay on Settings."
   */
  const AGENT_SCOPED_PREFIXES = ['/app/history', '/app/memory', '/app/tools'];
  const onAgentScopedRoute = AGENT_SCOPED_PREFIXES.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
  );

  // Active cosmos agent: either viewing an iframe agent, or a chat-only
  // agent is selected. Look up against the RAW list so the header still
  // reflects the user's choice even when the active agent happens to be
  // visibility-hidden (e.g. legacy state from before the dedup fix shipped).
  const activeCosmosAgent = agentViewMatch
    ? cosmosAgentsRaw.find((a) => a.id === agentViewMatch.params.agentId) ?? null
    : activeChatAgentId
      ? cosmosAgentsRaw.find((a) => a.id === activeChatAgentId) ?? null
      : null;

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getDropdownStyle = (): React.CSSProperties => {
    if (!buttonRef.current) return { position: 'fixed', zIndex: 9999 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    };
  };

  

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const switchAgent = useChatStore((s) => s.switchAgent);

  const handleSelectBuiltin = (agent: Agent) => {
    if (!isAgentAvailable(agent)) return;
    setActiveChatAgent(null);
    setActiveAgent(agent);
    switchAgent(agent.id);
    if (!onAgentScopedRoute) {
      navigate('/app/chat');
    }
    setOpen(false);
  };

  const handleSelectCosmos = (agentId: string) => {
    const agent = cosmosAgents.find((a) => a.id === agentId);
    if (agent?.manifest.display?.app_url) {
      // Iframe-backed agents aren't part of the chat/history/memory
      // model — always navigate to the agent's own view regardless
      // of current route.
      setActiveChatAgent(null);
      navigate(`/app/agent/${agentId}`);
    } else {
      setActiveChatAgent(agentId);
      switchAgent(agentId);
      if (!onAgentScopedRoute) {
        navigate('/app/chat');
      }
    }
    setOpen(false);
  };

  // Soft-launch lock: when only one agent is available (Athena during
  // soft-launch), there's nothing to pick — render a static pill instead
  // of a dropdown. No chevron, no click, no portal. Flip automatically
  // back to the dropdown the moment a second agent becomes visible.
  const totalAvailable = allBuiltinAgents.length + cosmosAgents.length;
  const locked = totalAvailable <= 1;

  if (compact) {
    const compactColor = activeCosmosAgent?.manifest.display?.color ?? '#6366f1';

    if (locked) {
      // Locked pill still tappable — clicking it navigates to the chat
      // route (home). This is how the user exits Settings / any other
      // non-chat route now that the standalone turtle logo is gone.
      return (
        <button
          onClick={() => navigate('/app/chat')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors"
          title="Home"
        >
          {activeCosmosAgent ? (
            <span
              className="w-5 h-5 rounded flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: `${compactColor}25`, color: compactColor }}
            >
              {resolveEmoji(activeCosmosAgent.manifest.identity.codename, agentTheme) || agentDisplayName(activeCosmosAgent).charAt(0)}
            </span>
          ) : (
            <span className="text-base leading-none">{activeAgent.icon}</span>
          )}
          <span className="text-sm font-semibold text-text-primary">
            {activeCosmosAgent ? agentDisplayName(activeCosmosAgent) : activeAgent.name}
          </span>
        </button>
      );
    }

    return (
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors w-full"
        >
          {activeCosmosAgent ? (
            <span
              className="w-5 h-5 rounded flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: `${compactColor}25`, color: compactColor }}
            >
              {resolveEmoji(activeCosmosAgent.manifest.identity.codename, agentTheme) || agentDisplayName(activeCosmosAgent).charAt(0)}
            </span>
          ) : (
            <span className="text-base leading-none">{activeAgent.icon}</span>
          )}
          <span className="text-sm font-semibold text-text-primary flex-1 text-left">
            {activeCosmosAgent ? agentDisplayName(activeCosmosAgent) : activeAgent.name}
          </span>
          <ChevronDown
            size={14}
            className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && createPortal(
          <div ref={dropdownRef} style={getDropdownStyle()} className="bg-surface-1 border border-border-muted rounded-xl shadow-lg shadow-black/30 py-1 animate-fade-in max-h-[70vh] overflow-y-auto">
            {allBuiltinAgents.map((agent) => {
              const locked = !isAgentAvailable(agent);
              const isActive = activeAgent.id === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => handleSelectBuiltin(agent)}
                  disabled={locked}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    locked
                      ? 'opacity-50 cursor-not-allowed'
                      : isActive
                        ? 'bg-shell-500/10 text-shell-400'
                        : 'hover:bg-surface-2 text-text-primary'
                  }`}
                  title={locked ? 'Add your API key in Agent Setup' : agent.description}
                >
                  <span className="text-base leading-none flex-shrink-0">{agent.icon}</span>
                  <span className="text-sm font-medium flex-1">{agent.name}</span>
                  {locked && <Lock size={12} className="text-text-muted flex-shrink-0" />}
                  {isActive && !locked && (
                    <div className="w-1.5 h-1.5 rounded-full bg-shell-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}

            {cosmosAgents.length > 0 && (
              <>
                <div className="my-1 border-t border-border-muted" />
                {cosmosAgents.map((a) => {
                  const color = a.manifest.display?.color ?? '#6366f1';
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleSelectCosmos(a.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2 text-text-primary transition-colors"
                    >
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: `${color}25`, color }}
                      >
                        {resolveEmoji(a.manifest.identity.codename, agentTheme) || agentDisplayName(a).charAt(0)}
                      </span>
                      <span className="text-sm font-medium flex-1">{agentDisplayName(a)}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>, document.body
        )}
      </div>
    );
  }

  // Desktop: inline in header
  const desktopColor = activeCosmosAgent?.manifest.display?.color ?? '#6366f1';

  if (locked) {
    // Soft-launch: single-agent pill, no dropdown — but still tappable.
    // Clicking navigates to the chat route so the pill doubles as the
    // "home" affordance (replacing the turtle logo that used to do this).
    return (
      <button
        onClick={() => navigate('/app/chat')}
        className="flex items-center gap-2 hover:bg-surface-2 rounded-lg px-2 py-1.5 transition-colors"
        title="Home"
      >
        {activeCosmosAgent ? (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: `${desktopColor}25`, color: desktopColor }}
          >
            {resolveEmoji(activeCosmosAgent.manifest.identity.codename, agentTheme) || agentDisplayName(activeCosmosAgent).charAt(0)}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-shell-500 to-shell-400 flex items-center justify-center text-xs flex-shrink-0">
            {activeAgent.icon}
          </div>
        )}
        <div className="text-left">
          <div className="text-sm font-semibold leading-tight">
            {activeCosmosAgent ? agentDisplayName(activeCosmosAgent) : activeAgent.name}
          </div>
          <div className="text-2xs text-text-muted">
            {activeCosmosAgent ? activeCosmosAgent.manifest.identity.purpose : activeAgent.description}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:bg-surface-2 rounded-lg px-2 py-1.5 transition-colors group"
      >
        {activeCosmosAgent ? (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: `${desktopColor}25`, color: desktopColor }}
          >
            {resolveEmoji(activeCosmosAgent.manifest.identity.codename, agentTheme) || agentDisplayName(activeCosmosAgent).charAt(0)}
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-shell-500 to-shell-400 flex items-center justify-center text-xs flex-shrink-0">
            {activeAgent.icon}
          </div>
        )}
        <div className="text-left">
          <div className="text-sm font-semibold leading-tight flex items-center gap-1">
            {activeCosmosAgent ? agentDisplayName(activeCosmosAgent) : activeAgent.name}
            <ChevronDown
              size={12}
              className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </div>
          <div className="text-2xs text-text-muted">
            {activeCosmosAgent ? activeCosmosAgent.manifest.identity.purpose : activeAgent.description}
          </div>
        </div>
      </button>

      {open && createPortal(
        <div ref={dropdownRef} style={{...getDropdownStyle(), width: 224}} className="bg-surface-1 border border-border-muted rounded-xl shadow-lg shadow-black/30 py-1 animate-fade-in max-h-[70vh] overflow-y-auto">
          {allBuiltinAgents.map((agent) => {
            const locked = !isAgentAvailable(agent);
            const isActive = activeAgent.id === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => handleSelectBuiltin(agent)}
                disabled={locked}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  locked
                    ? 'opacity-50 cursor-not-allowed'
                    : isActive
                      ? 'bg-shell-500/10 text-shell-400'
                      : 'hover:bg-surface-2 text-text-primary'
                }`}
                title={locked ? 'Add your API key in Agent Setup' : agent.description}
              >
                <span className="text-base leading-none flex-shrink-0">{agent.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{agent.name}</div>
                  <div className="text-2xs text-text-muted truncate">{agent.description}</div>
                </div>
                {locked && <Lock size={12} className="text-text-muted flex-shrink-0" />}
                {isActive && !locked && (
                  <div className="w-1.5 h-1.5 rounded-full bg-shell-400 flex-shrink-0" />
                )}
              </button>
            );
          })}

          {cosmosAgents.length > 0 && (
            <>
              <div className="my-1 border-t border-border-muted" />
              <div className="px-3 py-1">
                <span className="text-2xs text-text-muted uppercase tracking-wider font-semibold">Connected</span>
              </div>
              {cosmosAgents.map((a) => {
                const color = a.manifest.display?.color ?? '#6366f1';
                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelectCosmos(a.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2 text-text-primary transition-colors"
                  >
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: `${color}25`, color }}
                    >
                      {resolveEmoji(a.manifest.identity.codename, agentTheme) || agentDisplayName(a).charAt(0)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{agentDisplayName(a)}</div>
                      <div className="text-2xs text-text-muted truncate">{a.manifest.identity.purpose}</div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>, document.body
      )}
    </div>
  );
}
