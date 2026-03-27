import { useState, useRef, useEffect } from 'react';
import { Menu, ChevronRight } from 'lucide-react';
import { useAgentStatus } from '@/lib/hooks/useAgentStatus';
import type { AgentStatus } from '@/lib/hooks/useAgentStatus';
import { AgentPicker } from './AgentPicker';

interface HeaderProps {
  desktopSidebarOpen: boolean;
  onDesktopSidebarToggle: () => void;
  onMobileMenuToggle: () => void;
}

function formatBootTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function StatusPanel({ status, onClose }: { status: AgentStatus; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const rows: [string, string][] = [
    ['Status', status.status],
    ['Uptime', status.uptime],
    ['Version', `v${status.version}`],
    ['Environment', status.environment],
    ['Layer', status.layer],
    ['Domain', status.domain],
    ['Port', String(status.port)],
    ['Pantheon', status.pantheon],
    ['Boot Time', formatBootTime(status.bootTime)],
  ];

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 w-64 bg-surface-1 border border-border-muted rounded-xl shadow-lg shadow-black/30 p-3 animate-fade-in z-40"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-xs font-semibold text-text-primary">{status.title}</span>
        <span className="ml-auto text-[9px] text-text-muted/50 font-mono">{status.service}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] text-text-muted/60">{label}</span>
            <span className="text-[10px] font-medium text-text-secondary text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Header({ desktopSidebarOpen, onDesktopSidebarToggle, onMobileMenuToggle }: HeaderProps) {
  const { connectionState, agentStatus } = useAgentStatus();
  const [statusOpen, setStatusOpen] = useState(false);

  const dotColor =
    connectionState === 'online' ? 'bg-green-400' :
    connectionState === 'offline' ? 'bg-red-400' :
    'bg-yellow-400 animate-pulse';

  const label =
    connectionState === 'online' ? 'Online' :
    connectionState === 'offline' ? 'Offline' :
    'Checking...';

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

      {/* Right side — connection status */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => {
              if (connectionState === 'online' && agentStatus) setStatusOpen(!statusOpen);
            }}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 rounded-full transition-colors ${
              connectionState === 'online' && agentStatus ? 'hover:bg-surface-3 cursor-pointer' : ''
            }`}
            title={connectionState === 'online' ? 'View agent status' : label}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            <span className="text-2xs font-medium text-text-muted">{label}</span>
          </button>

          {statusOpen && agentStatus && (
            <StatusPanel status={agentStatus} onClose={() => setStatusOpen(false)} />
          )}
        </div>

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
