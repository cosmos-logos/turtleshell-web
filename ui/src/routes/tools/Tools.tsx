// routes/tools/Tools.tsx
//
// Per-agent Tools panel. Lives at /app/tools, same navigation rank as
// History and Memory. Scoped to the currently-active chat agent — just
// like memory, switching guides switches the tool list.
//
// Empty state: "No tools yet. [+ Add a tool]" — spells out what a tool
// is, why adding one is safe, and that the user is in control.
// Populated state: a row per binding with Disconnect.
//
// Adding requires the active agent to have a `trusted_tool_servers`
// entry for the tool. If the agent has none whitelisted, the Add
// button tells the user "Athena doesn't trust any tools yet." That's
// the safety rail.

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import { useChatStore } from '@/lib/store/chat-store';
import {
  useToolBindingsStore,
  removeToolBinding,
  type ToolBinding,
} from '@/lib/store/tool-bindings-store';
import { getManifestForAgentId } from '@/manifests';

function formatAddedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function Tools() {
  const activeAgentId = useChatStore((s) => s.activeAgentId);
  const bindingsMap = useToolBindingsStore((s) => s.bindings);
  const navigate = useNavigate();

  const bindings = useMemo<ToolBinding[]>(() => {
    const forAgent = bindingsMap[activeAgentId];
    return forAgent ? Object.values(forAgent) : [];
  }, [bindingsMap, activeAgentId]);

  const manifest = getManifestForAgentId(activeAgentId);
  const agentDisplayName = manifest?.identity?.name ?? activeAgentId;
  const trustedCount = manifest?.trusted_tool_servers?.length ?? 0;

  const handleDisconnect = (toolServerCodename: string, displayName: string) => {
    if (!confirm(`Disconnect ${displayName} from ${agentDisplayName}?\n\nThe sealed credentials will be deleted from this device and your profile. To use ${displayName} again you'll need to reconnect from scratch — we can't restore it for you because we can't read your login.`)) {
      return;
    }
    removeToolBinding(activeAgentId, toolServerCodename);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto pt-12 pb-24 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary leading-tight mb-2">
            Tools
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Tools let <span className="font-medium">{agentDisplayName}</span> reach beyond chat —
            into the apps and systems where your information already lives. Each tool you add
            stays with this guide only.
            {trustedCount === 0 && ' ' + agentDisplayName + " doesn't have any tools available yet."}
          </p>
        </div>

        {bindings.length === 0 ? (
          <EmptyState
            agentDisplayName={agentDisplayName}
            canAdd={trustedCount > 0}
            onAdd={() => navigate('/app/tools/add')}
          />
        ) : (
          <>
            <div className="space-y-2 mb-6">
              {bindings.map((b) => (
                <BindingRow
                  key={b.toolServerCodename}
                  binding={b}
                  onDisconnect={() => handleDisconnect(b.toolServerCodename, b.displayName)}
                />
              ))}
            </div>
            {trustedCount > bindings.length && (
              <Link
                to="/app/tools/add"
                className="inline-flex items-center gap-2 text-sm text-shell-400 hover:text-shell-300"
              >
                <Plus size={14} />
                Add another tool
              </Link>
            )}
          </>
        )}

        <TrustFootnote agentDisplayName={agentDisplayName} />
      </div>
    </div>
  );
}

function EmptyState({
  agentDisplayName,
  canAdd,
  onAdd,
}: {
  agentDisplayName: string;
  canAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="border border-border-muted rounded-xl bg-surface-1 p-8 text-center">
      <ShieldCheck size={28} className="mx-auto text-shell-400 mb-3" />
      <h2 className="text-lg font-semibold text-text-primary mb-1">No tools yet</h2>
      <p className="text-sm text-text-secondary max-w-md mx-auto mb-6 leading-relaxed">
        Each tool is a bridge to a service or system you already use. Add one and{' '}
        {agentDisplayName} can look things up there on your behalf. Your login is sealed
        on your device before it leaves — only the tool itself can unlock it.
      </p>
      <button
        onClick={onAdd}
        disabled={!canAdd}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-shell-600/20 border border-shell-500/30 text-shell-300 hover:bg-shell-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={16} />
        {canAdd ? 'Add a tool' : 'No tools available for this guide'}
      </button>
    </div>
  );
}

function BindingRow({
  binding,
  onDisconnect,
}: {
  binding: ToolBinding;
  onDisconnect: () => void;
}) {
  return (
    <div
      className="flex items-center gap-4 border border-border-muted rounded-xl bg-surface-1 p-4"
      style={binding.color ? { borderLeftColor: binding.color, borderLeftWidth: 3 } : undefined}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text-primary">{binding.displayName}</div>
        <div className="text-xs text-text-muted truncate">
          Added {formatAddedAt(binding.addedAt)} · sealed to {binding.toolServerCodename}
        </div>
      </div>
      <button
        onClick={onDisconnect}
        className="text-text-muted hover:text-red-400 transition-colors p-2"
        title="Disconnect"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function TrustFootnote({ agentDisplayName }: { agentDisplayName: string }) {
  return (
    <div className="mt-10 pt-6 border-t border-border-muted">
      <p className="text-xs text-text-muted leading-relaxed">
        <span className="font-medium">How we keep your logins safe:</span>{' '}
        When you connect a tool, your login is encrypted on your device using a key that only
        that tool's server can unlock. Not your browser. Not {agentDisplayName}. Not us.
        If your connection breaks, you'll reconnect here — we can't restore it for you,
        because we can't read it.
      </p>
    </div>
  );
}
