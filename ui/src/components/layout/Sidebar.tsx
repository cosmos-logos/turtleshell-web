import { useState, useEffect, useCallback } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Plug,
  LifeBuoy,
  Settings,
  BookOpen,
  History,
  Brain,
  ChevronLeft,
  ChevronRight,
  X,
  Shell,
  LogOut,
  User,
} from 'lucide-react';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { agentDisplayName } from '@/lib/cosmos-logos/types';
import { clearStoredTokens, serverLogout } from '@/lib/api/olympus-grid-client';
import { useServiceStore } from '@/lib/store/service-store';
import { useAgentStore } from '@/lib/store/agent-store';
import { plutusClient, type QuotaResponse } from '@/lib/api/plutus-client';
import { getShellId } from '@/lib/api/olympus-grid-client';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  position: 'left' | 'right';
}

interface NavItem {
  to?: string;
  label: string;
  icon?: React.ElementType;
  initial?: string;
  color?: string;
  type?: 'section';
  /** cosmos agent ID for chat-only agents — used for active state */
  chatAgentId?: string;
  /** built-in agent ID — used for active state when on chat */
  isBuiltinChat?: string;
}

function useNavItems(): NavItem[] {
  const cosmosAgents = useCosmosLogosStore((s) => s.agents);
  const builtinAgents = useAgentStore((s) => s.agents);
  const hiddenIds = useAgentStore((s) => s.hiddenAgentIds);

  // Built-in agents (Logos, Cosmos, Claude, OpenAI, Grok, Gemini, custom)
  const builtinItems: NavItem[] = builtinAgents
    .filter(a => !hiddenIds.has(a.id))
    .map((a) => ({
      to: `/app/chat?agent_builtin=${a.id}`,
      label: a.name,
      initial: a.icon || a.name.charAt(0).toUpperCase(),
      color: '#6366f1',
      chatAgentId: undefined, // handled via agent_builtin param
      isBuiltinChat: a.id,
    }));

  // Cosmos-logos agents (Athena, Homework Buddy, Thoth, etc.)
  const cosmosItems: NavItem[] = cosmosAgents
    .filter(a => !hiddenIds.has(a.id))
    .map((a) => {
      const name = agentDisplayName(a);
      return {
        to: a.manifest.display?.app_url ? `/app/agent/${a.id}` : `/app/chat?agent=${a.id}`,
        label: name,
        initial: name.charAt(0).toUpperCase(),
        color: a.manifest.display?.color ?? '#6366f1',
        chatAgentId: a.manifest.display?.app_url ? undefined : a.id,
      };
    });

  return [
    { label: 'Agents', type: 'section' },
    ...builtinItems,
    ...cosmosItems,
    { to: '/app/history', icon: History, label: 'History' },
    { to: '/app/memory', icon: Brain, label: 'Memory' },
    { to: '/app/services', icon: Plug, label: 'Services' },
    { to: '/app/service-desk', icon: LifeBuoy, label: 'Service Desk' },
    { to: '/app/docs', icon: BookOpen, label: 'Docs' },
    { to: '/app/shells', icon: Shell, label: 'Sea Shells' },
    { to: '/app/settings', icon: Settings, label: 'Settings' },
  ];
}


function UserFooter({ expanded }: { expanded: boolean }) {
  const navigate = useNavigate();
  const ogUser = useServiceStore((s) => s.olympusGridUser);
  const email = ogUser?.email || localStorage.getItem('olympus_grid_email') || '';
  const username = localStorage.getItem('turtleshell_username') || email.split('@')[0] || '';

  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const handleLogoutClick = useCallback(() => {
    if (confirmingLogout) {
      // Second click — actually log out
      serverLogout().then(() => {
        clearStoredTokens();
        useServiceStore.getState().disconnectOlympusGrid();
        navigate('/login', { replace: true });
      });
    } else {
      setConfirmingLogout(true);
      setTimeout(() => setConfirmingLogout(false), 3000);
    }
  }, [confirmingLogout, navigate]);

  if (!expanded) {
    return (
      <div className="px-2 py-2 flex flex-col items-center gap-1.5">
        <Link to="/app/profile" className="w-7 h-7 rounded-full bg-shell-500/10 flex items-center justify-center hover:bg-shell-500/20 transition-colors" title="View profile">
          <User size={13} className="text-shell-400" />
        </Link>
        <button onClick={handleLogoutClick} className={`p-1.5 rounded-md transition-colors ${confirmingLogout ? 'bg-red-500/20 text-red-400' : 'hover:bg-red-500/10 text-text-muted hover:text-red-400'}`} title={confirmingLogout ? 'Click again to confirm' : 'Log out'}>
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2">
        <Link to="/app/profile" className="w-7 h-7 rounded-full bg-shell-500/10 flex items-center justify-center flex-shrink-0 hover:bg-shell-500/20 transition-colors" title="View profile">
          <User size={13} className="text-shell-400" />
        </Link>
        <div className="flex-1 min-w-0">
          <Link to="/app/profile" className="block no-underline">
            <p className="text-xs font-medium text-text-primary truncate hover:text-shell-400 transition-colors">{username}</p>
          </Link>
          {email && <p className="text-2xs text-text-muted truncate">{email}</p>}
        </div>
        <button onClick={handleLogoutClick} className={`p-1.5 rounded-md transition-colors ${confirmingLogout ? 'bg-red-500/20 text-red-400' : 'hover:bg-red-500/10 text-text-muted hover:text-red-400'}`} title={confirmingLogout ? 'Click again to confirm' : 'Log out'}>
          <LogOut size={14} />
        </button>
      </div>
      {confirmingLogout && (
        <p className="text-2xs text-red-400 mt-1 ml-9">Click again to log out</p>
      )}
    </div>
  );
}

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


function useIsNavActive(item: NavItem): boolean {
  const location = useLocation();
  const activeChatAgentId = useCosmosLogosStore((s) => s.activeChatAgentId);
  const activeBuiltinId = useAgentStore((s) => s.activeAgent.id);
  const onChatPage = location.pathname === '/app/chat';

  if (item.isBuiltinChat) {
    // Built-in agent: active when on chat, no cosmos agent active, and this is the active built-in
    return onChatPage && !activeChatAgentId && activeBuiltinId === item.isBuiltinChat;
  }
  if (item.chatAgentId) {
    // Cosmos chat agent: active when on chat and this cosmos agent is active
    return onChatPage && activeChatAgentId === item.chatAgentId;
  }
  if (item.to === '/app/chat') {
    // Generic Chat link: hidden from nav now, but if present, active when on chat with no specific agent
    return onChatPage && !activeChatAgentId;
  }
  // Iframe agents and other nav items: standard path match
  return location.pathname.startsWith(item.to || '---never---');
}

function AgentSectionHeader({ expanded, onClick }: { expanded: boolean; onClick?: () => void }) {
  return (
    <div className={`flex items-center justify-between ${expanded ? 'px-3 pt-4 pb-1' : 'px-1 pt-3 pb-1'}`}>
      {expanded ? (
        <>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Agents</span>
          <NavLink
            to="/app/agents"
            onClick={onClick}
            className="p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors"
            title="Agent Setup"
          >
            <Settings size={12} />
          </NavLink>
        </>
      ) : (
        <div className="w-full border-t border-border-muted mx-1" />
      )}
    </div>
  );
}

function SidebarNavItem({ item, onClick, expanded = true }: { item: NavItem; onClick?: () => void; expanded?: boolean }) {
  const isActive = useIsNavActive(item);
  const { to, icon: Icon, label, initial, color } = item;
  const isAgentSubItem = !!(item.isBuiltinChat || item.chatAgentId || (item.initial && !item.icon));

  return (
    <NavLink
      key={to}
      to={to!}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg font-medium transition-colors ${
        isAgentSubItem && expanded ? 'pl-5 pr-3 py-1.5 text-xs' : 'px-3 py-2.5 text-sm'
      } ${
        expanded ? '' : 'justify-center'
      } ${
        isActive
          ? 'bg-surface-3 text-text-primary'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
      }`}
      title={expanded ? undefined : label}
    >
      {Icon ? (
        <Icon size={isAgentSubItem ? 14 : 18} className="flex-shrink-0" />
      ) : (
        <span
          className={`rounded flex items-center justify-center font-bold flex-shrink-0 ${
            isAgentSubItem ? 'w-[16px] h-[16px] text-[9px]' : 'w-[18px] h-[18px] text-[10px]'
          }`}
          style={{ backgroundColor: `${color}25`, color }}
        >
          {initial}
        </span>
      )}
      {expanded && <span className="whitespace-nowrap">{label}</span>}
    </NavLink>
  );
}

export function Sidebar({ open, onToggle, onClose, position }: SidebarProps) {
  const navItems = useNavItems();
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
          {navItems.map((item) => {
            if (item.type === 'section') {
              return <AgentSectionHeader key={`section-${item.label}`} expanded onClick={onClose} />;
            }
            return <SidebarNavItem key={item.to} item={item} onClick={onClose} />;
          })}
        </nav>

        {/* Sea Shell balance badge */}
        <SeaShellBadge expanded />

        {/* User + Logout */}
        <UserFooter expanded />
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
        {navItems.map((item) => {
          if (item.type === 'section') {
            return <AgentSectionHeader key={`section-${item.label}`} expanded={open} />;
          }
          return <SidebarNavItem key={item.to} item={item} expanded={open} />;
        })}
      </nav>

      {/* Shell badge */}
      <SeaShellBadge expanded={open} />

      {/* User + Logout (below shells) */}
      <UserFooter expanded={open} />
      {!open && (
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
