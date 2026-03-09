import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { useAgentStore, AGENT_CATALOG, hasOlympusGridToken } from '@/lib/store/agent-store';
import type { Agent } from '@/types/agent';

interface AgentPickerProps {
  /** Compact mode for mobile — renders inline without the icon orb. */
  compact?: boolean;
}

export function AgentPicker({ compact }: AgentPickerProps) {
  const { activeAgent, setActiveAgent } = useAgentStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAuthed = hasOlympusGridToken();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = (agent: Agent) => {
    const needsAuth = agent.requiredServices.includes('olympus_grid');
    if (needsAuth && !isAuthed) return; // locked
    setActiveAgent(agent);
    setOpen(false);
  };

  if (compact) {
    return (
      <div ref={containerRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors w-full"
        >
          <span className="text-base leading-none">{activeAgent.icon}</span>
          <span className="text-sm font-semibold text-text-primary flex-1 text-left">
            {activeAgent.name}
          </span>
          <ChevronDown
            size={14}
            className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface-1 border border-border-muted rounded-xl shadow-lg shadow-black/30 py-1 z-50 animate-fade-in">
            {AGENT_CATALOG.map((agent) => {
              const locked = agent.requiredServices.includes('olympus_grid') && !isAuthed;
              const isActive = activeAgent.id === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => handleSelect(agent)}
                  disabled={locked}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    locked
                      ? 'opacity-50 cursor-not-allowed'
                      : isActive
                        ? 'bg-shell-500/10 text-shell-400'
                        : 'hover:bg-surface-2 text-text-primary'
                  }`}
                  title={locked ? 'Unlock with TurtleShell account' : agent.description}
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
          </div>
        )}
      </div>
    );
  }

  // Desktop: inline in header
  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:bg-surface-2 rounded-lg px-2 py-1.5 transition-colors group"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-shell-500 to-shell-400 flex items-center justify-center text-xs flex-shrink-0">
          {activeAgent.icon}
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold leading-tight flex items-center gap-1">
            {activeAgent.name}
            <ChevronDown
              size={12}
              className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </div>
          <div className="text-2xs text-text-muted">
            {activeAgent.description}
          </div>
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-surface-1 border border-border-muted rounded-xl shadow-lg shadow-black/30 py-1 z-50 animate-fade-in">
          {AGENT_CATALOG.map((agent) => {
            const locked = agent.requiredServices.includes('olympus_grid') && !isAuthed;
            const isActive = activeAgent.id === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => handleSelect(agent)}
                disabled={locked}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  locked
                    ? 'opacity-50 cursor-not-allowed'
                    : isActive
                      ? 'bg-shell-500/10 text-shell-400'
                      : 'hover:bg-surface-2 text-text-primary'
                }`}
                title={locked ? 'Unlock with TurtleShell account' : agent.description}
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
        </div>
      )}
    </div>
  );
}
