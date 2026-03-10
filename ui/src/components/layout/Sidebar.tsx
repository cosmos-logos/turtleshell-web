import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  MessageSquare,
  Plug,
  LifeBuoy,
  Bot,
  Settings,
  BookOpen,
  History,
  Brain,
  ChevronLeft,
  ChevronRight,
  X,
  Cloud,
  House,
  Shell,
} from 'lucide-react';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import type { AppEnvironment } from '@/lib/store/environment-store';
import { plutusClient, type QuotaResponse } from '@/lib/api/plutus-client';
import { getShellId } from '@/lib/api/olympus-grid-client';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  position: 'left' | 'right';
}

const navItems = [
  { to: '/app/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/app/history', icon: History, label: 'History' },
  { to: '/app/memory', icon: Brain, label: 'Memory' },
  { to: '/app/services', icon: Plug, label: 'Services' },
  { to: '/app/service-desk', icon: LifeBuoy, label: 'Service Desk' },
  { to: '/app/agents', icon: Bot, label: 'Agents' },
  { to: '/app/docs', icon: BookOpen, label: 'Docs' },
  { to: '/app/shells', icon: Shell, label: 'Sea Shells' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

const envConfig: Record<AppEnvironment, { Icon: typeof Cloud; label: string }> = {
  cloud: { Icon: Cloud, label: 'CLOUD' },
  offgrid: { Icon: House, label: 'OFF-GRID' },
  custom: { Icon: Settings, label: 'CUSTOM' },
};

function SeaShellBadge({ expanded }: { expanded: boolean }) {
  const [quota, setQuota] = useState<QuotaResponse | null>(null);

  useEffect(() => {
    const fetch = () => plutusClient.getQuota(getShellId()).then(setQuota).catch(() => {});
    fetch();
    window.addEventListener('shells:updated', fetch);
    return () => window.removeEventListener('shells:updated', fetch);
  }, []);

  const cachedTier = localStorage.getItem('turtleshell-cached-tier');
  const plutusTier = quota?.tier ?? 'free';
  const effectiveTier = (plutusTier !== 'free' ? plutusTier : cachedTier) ?? 'free';

  if (!quota && !cachedTier) return null;

  const isFree = effectiveTier === 'free';
  const shellsRemaining = quota?.shells_remaining ?? null;
  const isUnlimited = shellsRemaining === null && !isFree;

  let label: string;
  let colorClass: string;
  if (quota?.blocked) {
    label = expanded ? 'Empty — Upgrade' : '!';
    colorClass = 'text-red-400 bg-red-500/10 border-red-500/30';
  } else if (isFree) {
    label = expanded ? (shellsRemaining !== null ? `${shellsRemaining.toLocaleString()} shells` : 'Free tier') : (shellsRemaining !== null ? `${shellsRemaining.toLocaleString()}` : 'Free');
    colorClass = 'text-text-muted bg-surface-2 border-border-muted';
  } else if (isUnlimited) {
    label = expanded ? 'Unlimited' : '∞';
    colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  } else {
    label = expanded ? `${shellsRemaining!.toLocaleString()} shells` : `${shellsRemaining!.toLocaleString()}`;
    colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  }

  return (
    <div className="px-2 pb-1">
      <Link
        to="/app/shells"
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:opacity-80 no-underline ${colorClass} ${
          expanded ? '' : 'justify-center'
        }`}
        title={expanded ? undefined : `🐚 ${label}`}
      >
        <span className="flex-shrink-0">🐚</span>
        {expanded && <span className="whitespace-nowrap">{label}</span>}
      </Link>
    </div>
  );
}

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
          open ? 'translate-x-0' : 'translate-x-full invisible'
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

        {/* Sea Shell balance badge */}
        <SeaShellBadge expanded />
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

      {/* Bottom: shell badge + env badge (expanded) or expand button (collapsed) */}
      <SeaShellBadge expanded={open} />
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
