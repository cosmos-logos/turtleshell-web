import { Check } from 'lucide-react';
import { useAgentStore } from '@/lib/store/agent-store';
import type { Agent } from '@/types/agent';

const AGENT_CATALOG: Agent[] = [
  {
    id: 'athena',
    name: 'Athena',
    description: 'Sovereign AI Assistant — General-purpose reasoning, MCP integration, and enterprise workflows.',
    icon: '⚡',
    capabilities: ['chat', 'mcp', 'reasoning'],
    requiredServices: [],
  },
  {
    id: 'apollo',
    name: 'Apollo',
    description: 'Voice-enabled assistant with text-to-speech and audio capabilities.',
    icon: '🎵',
    capabilities: ['chat', 'voice', 'reasoning'],
    requiredServices: [],
  },
  {
    id: 'hermes',
    name: 'Hermes',
    description: 'Communication specialist — Slack, email, and messaging workflows.',
    icon: '✉️',
    capabilities: ['chat', 'mcp'],
    requiredServices: ['slack'],
  },
  {
    id: 'hephaestus',
    name: 'Hephaestus',
    description: 'Code and engineering assistant — GitHub integration, PR reviews, and DevOps.',
    icon: '🔨',
    capabilities: ['chat', 'mcp', 'code'],
    requiredServices: ['github'],
  },
];

export function Agents() {
  const { activeAgent, setActiveAgent } = useAgentStore();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-text-muted mt-1">
            Switch between specialized AI agents. Each agent has unique capabilities.
          </p>
        </div>

        <div className="space-y-3">
          {AGENT_CATALOG.map((agent) => {
            const isActive = activeAgent.id === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => setActiveAgent(agent)}
                className={`w-full text-left p-5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-shell-500/5 border-shell-500/30 ring-1 ring-shell-500/10'
                    : 'bg-surface-1 border-border-muted hover:border-border hover:bg-surface-2'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                        isActive
                          ? 'bg-shell-500/20'
                          : 'bg-surface-3'
                      }`}
                    >
                      {agent.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{agent.name}</span>
                        {isActive && (
                          <span className="flex items-center gap-1 text-2xs font-medium text-shell-400 bg-shell-500/10 px-2 py-0.5 rounded-full">
                            <Check size={10} /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-text-muted mt-1 leading-relaxed max-w-md">
                        {agent.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {agent.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="text-2xs font-medium px-2 py-0.5 bg-surface-3 rounded-full text-text-muted"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
