import { useState, useRef, useEffect } from 'react';
import { Menu, ChevronRight } from 'lucide-react';
import { useAgentStatus } from '@/lib/hooks/useAgentStatus';
import type { AgentHealth } from '@/lib/hooks/useAgentStatus';
import { AgentPicker } from './AgentPicker';

interface HeaderProps {
  desktopSidebarOpen: boolean;
  onDesktopSidebarToggle: () => void;
  onMobileMenuToggle: () => void;
}

function HealthPanel({ agents, onClose }: { agents: AgentHealth[]; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-72 bg-surface-1 border border-border-muted rounded-xl shadow-lg shadow-black/30 p-3 animate-fade-in z-40"
    >
      <div className="text-2xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        Connected Agents
      </div>
      <div className="space-y-1.5">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-2 px-2 py-1.5 bg-surface-2 rounded-lg">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              agent.status === 'online' ? 'bg-green-400' :
              agent.status === 'checking' ? 'bg-yellow-400 animate-pulse' :
              'bg-red-400'
            }`} />
            <span className="text-xs font-medium text-text-primary flex-1 truncate">{agent.name}</span>
            {agent.latency !== undefined && (
              <span className="text-[9px] font-mono text-text-muted">{agent.latency}ms</span>
            )}
            <span className={`text-[9px] font-medium ${
              agent.status === 'online' ? 'text-green-400' : 'text-red-400'
            }`}>
              {agent.status}
            </span>
          </div>
        ))}
      </div>
      {agents.length === 0 && (
        <p className="text-2xs text-text-muted py-2">No agents connected.</p>
      )}
    </div>
  );
}

export function Header({ desktopSidebarOpen, onDesktopSidebarToggle, onMobileMenuToggle }: HeaderProps) {
  const { connectionState, agentHealths } = useAgentStatus();
  const [statusOpen, setStatusOpen] = useState(false);

  // Don't render the status indicator when not in developer mode (connectionState will be 'offline' with no agents)
  const showStatus = agentHealths.length > 0;

  const dotColor =
    connectionState === 'online' ? 'bg-green-400' :
    connectionState === 'partial' ? 'bg-yellow-400' :
    connectionState === 'offline' ? 'bg-red-400' :
    'bg-yellow-400 animate-pulse';

  const onlineCount = agentHealths.filter(a => a.status === 'online').length;
  const label = connectionState === 'checking' ? 'Checking...'
    : `${onlineCount}/${agentHealths.length} online`;

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-border-muted bg-surface-0/80 backdrop-blur-md">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {!desktopSidebarOpen && (
          <button
            onClick={onDesktopSidebarToggle}
            className="hidden md:flex p-2 rounded-md hover:bg-surface-3 text-text-muted transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Mobile: TurtleShell logo + agent picker */}
        <div className="flex items-center gap-2 md:hidden">
          <a href="/" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-shell-500 to-shell-400 flex items-center justify-center text-xs">
              🐢
            </div>
          </a>
          <AgentPicker compact />
        </div>

        {/* Desktop: agent picker */}
        <div className="hidden md:flex items-center gap-2">
          <AgentPicker />
        </div>
      </div>

      {/* Right side — connection status (developer mode only) */}
      <div className="flex items-center gap-3">
        {showStatus && (
          <div className="relative">
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 rounded-full transition-colors hover:bg-surface-3 cursor-pointer"
              title="Agent health status"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              <span className="text-2xs font-medium text-text-muted">{label}</span>
            </button>

            {statusOpen && (
              <HealthPanel agents={agentHealths} onClose={() => setStatusOpen(false)} />
            )}
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="p-2 rounded-md hover:bg-surface-3 text-text-muted transition-colors md:hidden"
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
}
