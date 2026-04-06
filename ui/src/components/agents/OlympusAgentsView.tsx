import { useState } from 'react';
import { OLYMPUS_AGENTS, type OlympusAgent } from '@/lib/agents/olympus-data';
import { COSMOS_AGENTS, type AgentConfig } from '@/routes/Agents';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { OlympusAgentCard } from './OlympusAgentCard';
import { OlympusConnectPanel } from './OlympusConnectPanel';

export function OlympusAgentsView() {
  const [selectedCodename, setSelectedCodename] = useState<string | null>(null);
  const cosmosAgents = useCosmosLogosStore(s => s.agents);

  const selectedOlympus: OlympusAgent | null = OLYMPUS_AGENTS.find(a => a.codename === selectedCodename) ?? null;
  const selectedConfig: AgentConfig | null = COSMOS_AGENTS.find((a: AgentConfig) => a.codename === selectedCodename) ?? null;

  const isConnected = (codename: string) =>
    cosmosAgents.some(a => a.manifest.identity.codename === codename);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#080810' }}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="font-cinzel text-[10px] tracking-[0.35em] uppercase mb-3" style={{ color: '#1a1828' }}>
            TurtleShell.ai · Agent Fleet · v1.7.2
          </div>
          <h1 className="font-cinzel text-sm tracking-[0.25em] uppercase">
            <span style={{ color: '#c4a227' }}>Olympus</span>
          </h1>
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {OLYMPUS_AGENTS.map((agent: OlympusAgent, i: number) => (
            <div key={agent.codename} style={{ animationDelay: `${i * 0.08}s` }}>
              <OlympusAgentCard
                agent={agent}
                connected={isConnected(agent.codename)}
                onClick={() => setSelectedCodename(agent.codename)}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <div className="font-cinzel text-[9px] tracking-[0.3em] uppercase" style={{ color: '#1a1828' }}>
            cosmos-logos v1.0.3 · Ed25519 Sealed Envelopes
          </div>
        </div>
      </div>

      {/* Connect panel */}
      {selectedOlympus && (
        <OlympusConnectPanel
          agent={selectedOlympus}
          config={selectedConfig}
          onClose={() => setSelectedCodename(null)}
        />
      )}
    </div>
  );
}
