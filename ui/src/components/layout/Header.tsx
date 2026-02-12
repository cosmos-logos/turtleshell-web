import { Menu, ChevronRight, Zap, LogOut } from 'lucide-react';
import { useAgentStore } from '@/lib/store/agent-store';
import { useServiceStore } from '@/lib/store/service-store';

interface HeaderProps {
  desktopSidebarOpen: boolean;
  onDesktopSidebarToggle: () => void;
  onMobileMenuToggle: () => void;
}

export function Header({ desktopSidebarOpen, onDesktopSidebarToggle, onMobileMenuToggle }: HeaderProps) {
  const activeAgent = useAgentStore((s) => s.activeAgent);
  const olympusGridUser = useServiceStore((s) => s.olympusGridUser);
  const disconnectOlympusGrid = useServiceStore((s) => s.disconnectOlympusGrid);

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-border-muted bg-surface-0/80 backdrop-blur-md">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Desktop: expand button when sidebar collapsed */}
        {!desktopSidebarOpen && (
          <button
            onClick={onDesktopSidebarToggle}
            className="hidden md:flex p-2 rounded-md hover:bg-surface-3 text-text-muted transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Mobile: TurtleShell logo */}
        <a href="/" className="flex items-center gap-2 no-underline md:hidden">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-shell-500 to-shell-400 flex items-center justify-center text-xs">
            🐢
          </div>
          <span className="font-semibold text-sm tracking-tight text-text-primary">
            TurtleShell<span className="text-shell-400">.ai</span>
          </span>
        </a>

        {/* Desktop: agent info */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-shell-500 to-shell-400 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">
              {activeAgent?.name ?? 'Athena'}
            </div>
            <div className="text-2xs text-text-muted">
              {activeAgent?.description ?? 'Sovereign AI Assistant'}
            </div>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {olympusGridUser ? (
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-shell-400" />
              <span className="text-2xs font-medium text-text-muted">
                {olympusGridUser.email}
              </span>
            </div>
            <button
              onClick={disconnectOlympusGrid}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
              title="Sign out of Olympus-Grid"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-shell-400" />
            <span className="text-2xs font-medium text-text-muted">Connected</span>
          </div>
        )}

        {/* Mobile hamburger — RIGHT side */}
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
