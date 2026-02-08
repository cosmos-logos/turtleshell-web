import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  Plug,
  Bot,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  Cloud,
  House,
} from 'lucide-react';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import type { AppEnvironment } from '@/lib/store/environment-store';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  position: 'left' | 'right';
}

const navItems = [
  { to: '/app/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/app/services', icon: Plug, label: 'Services' },
  { to: '/app/agents', icon: Bot, label: 'Agents' },
  { to: '/app/docs', icon: BookOpen, label: 'Docs' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

const envConfig: Record<AppEnvironment, { Icon: typeof Cloud; label: string }> = {
  cloud: { Icon: Cloud, label: 'CLOUD' },
  offgrid: { Icon: House, label: 'OFF-GRID' },
  custom: { Icon: Settings, label: 'CUSTOM' },
};

function EnvironmentBadge() {
  const current = useEnvironmentStore((s) => s.current);
  const developerMode = useEnvironmentStore((s) => s.developerMode);

  if (!developerMode) return null;

  const { Icon, label } = envConfig[current];

  return (
    <div className="px-3 py-3 border-t border-border-muted">
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 rounded-lg">
        <Icon size={14} className="text-shell-400 flex-shrink-0" />
        <span className="text-2xs font-medium text-text-muted uppercase tracking-wider whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}

export function Sidebar({ open, onToggle, onClose, position }: SidebarProps) {
  if (position === 'right') {
    return (
      <aside
        className={`fixed top-0 right-0 h-full w-72 bg-surface-1 border-l border-border-muted z-40 flex flex-col transition-transform duration-250 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border-muted flex-shrink-0">
          <a href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-shell-500 to-shell-400 flex items-center justify-center text-sm">
              🐢
            </div>
            <span className="font-semibold text-sm tracking-tight text-text-primary">
              TurtleShell<span className="text-shell-400">.ai</span>
            </span>
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-3 text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Environment badge (developer mode only) */}
        <EnvironmentBadge />
      </aside>
    );
  }

  // Desktop sidebar — left, inline
  return (
    <aside
      className={`h-full bg-surface-1 border-r border-border-muted flex flex-col flex-shrink-0 transition-[width] duration-200 overflow-hidden ${
        open ? 'w-60' : 'w-14'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border-muted flex-shrink-0">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-shell-500 to-shell-400 flex items-center justify-center text-sm flex-shrink-0">
            🐢
          </div>
          {open && (
            <span className="font-semibold text-sm tracking-tight text-text-primary whitespace-nowrap">
              TurtleShell<span className="text-shell-400">.ai</span>
            </span>
          )}
        </a>
        {open && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                open ? '' : 'justify-center'
              } ${
                isActive
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              }`
            }
            title={open ? undefined : label}
          >
            <Icon size={18} className="flex-shrink-0" />
            {open && <span className="whitespace-nowrap">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: env badge (expanded) or expand button (collapsed) */}
      {open ? (
        <EnvironmentBadge />
      ) : (
        <div className="px-2 py-3 border-t border-border-muted flex justify-center">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
