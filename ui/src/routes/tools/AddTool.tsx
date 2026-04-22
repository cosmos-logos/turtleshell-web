// routes/tools/AddTool.tsx
//
// Picker screen for "which tool do you want to add?". Reads the
// active agent's `trusted_tool_servers` from its bundled manifest
// and renders one card per entry. Clicking a card routes to the
// ceremony for that onboarding type — today, only Salesforce OAuth
// is wired. Future entries (Google, HubSpot, etc.) route to their
// own wizards without touching this file.
//
// Critical: we never reveal tools that are NOT in the agent's
// whitelist. That's the trust boundary — users can't bolt a rogue
// MCP server onto an agent.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, ArrowRight } from 'lucide-react';
import { useChatStore } from '@/lib/store/chat-store';
import { useToolBindingsStore } from '@/lib/store/tool-bindings-store';
import { getManifestForAgentId } from '@/manifests';
import type { TrustedToolServer } from '@/lib/cosmos-logos/types';

export function AddTool() {
  const activeAgentId = useChatStore((s) => s.activeAgentId);
  const bindingsMap = useToolBindingsStore((s) => s.bindings);
  const navigate = useNavigate();

  const manifest = getManifestForAgentId(activeAgentId);
  const agentDisplayName = manifest?.identity?.name ?? activeAgentId;
  const trusted = manifest?.trusted_tool_servers ?? [];

  const alreadyBound = useMemo(() => {
    return new Set(Object.keys(bindingsMap[activeAgentId] ?? {}));
  }, [bindingsMap, activeAgentId]);

  const handlePick = (tool: TrustedToolServer) => {
    // Each `onboarding` kind maps to a distinct wizard route. The
    // wizard fetches the full tool object from the active agent's
    // manifest using the `codename` query param.
    if (tool.onboarding === 'salesforce-oauth') {
      navigate(`/app/tools/add/salesforce?codename=${encodeURIComponent(tool.codename)}`);
      return;
    }
    if (tool.onboarding === 'google-oauth') {
      navigate(`/app/tools/add/google?codename=${encodeURIComponent(tool.codename)}`);
      return;
    }
    // Other onboarding types come in future slices.
    alert(`${tool.display_name} onboarding is coming soon.`);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto pt-12 pb-24 px-4">
        <button
          onClick={() => navigate('/app/tools')}
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors mb-4"
        >
          <ChevronLeft size={14} />
          Back to Tools
        </button>

        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Add a tool to {agentDisplayName}
        </h1>
        <p className="text-sm text-text-secondary leading-relaxed mb-8">
          Pick a tool below. Your login for it stays on your device — sealed with a key only
          that tool's server can use. You're the only one who can unlock it.
        </p>

        {trusted.length === 0 ? (
          <div className="border border-border-muted rounded-xl bg-surface-1 p-6 text-center">
            <ShieldCheck size={24} className="mx-auto text-text-muted mb-3" />
            <p className="text-sm text-text-secondary">
              {agentDisplayName} hasn't whitelisted any tools yet. Switch to a guide that
              supports tools, or check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trusted.map((t) => (
              <ToolCard
                key={t.codename}
                tool={t}
                alreadyAdded={alreadyBound.has(t.codename)}
                onPick={() => handlePick(t)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCard({
  tool,
  alreadyAdded,
  onPick,
}: {
  tool: TrustedToolServer;
  alreadyAdded: boolean;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      disabled={alreadyAdded}
      className="w-full text-left border border-border-muted rounded-xl bg-surface-1 p-5 hover:bg-surface-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-4"
      style={tool.color ? { borderLeftColor: tool.color, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-text-primary">{tool.display_name}</span>
          {alreadyAdded && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-shell-600/20 text-shell-300">
              Already added
            </span>
          )}
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">{tool.description}</p>
      </div>
      {!alreadyAdded && <ArrowRight size={16} className="text-text-muted" />}
    </button>
  );
}
