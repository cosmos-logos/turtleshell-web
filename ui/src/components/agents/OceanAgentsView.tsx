import { useState } from 'react';
import { OCEAN_AGENTS } from '@/lib/agents/ocean-data';
import { COSMOS_AGENTS } from '@/routes/Agents';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { OceanAgentCard } from './OceanAgentCard';
import { OceanConnectPanel } from './OceanConnectPanel';

export function OceanAgentsView() {
  const [selectedCodename, setSelectedCodename] = useState<string | null>(null);
  const cosmosAgents = useCosmosLogosStore(s => s.agents);

  const selectedOcean = OCEAN_AGENTS.find(a => a.codename === selectedCodename) ?? null;
  const selectedConfig = COSMOS_AGENTS.find(a => a.codename === selectedCodename) ?? null;

  const isConnected = (codename: string) =>
    cosmosAgents.some(a => a.manifest.identity.codename === codename);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#030810' }}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="font-cinzel text-[10px] tracking-[0.35em] uppercase mb-3" style={{ color: '#0a1428' }}>
            TurtleShell.ai · Agent Fleet · v1.7.2
          </div>
          <h1 className="font-cinzel text-sm tracking-[0.25em] uppercase">
            <span style={{ color: '#00c8ff' }}>The Ocean</span>
          </h1>
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {OCEAN_AGENTS.map((agent, i) => (
            <div key={agent.codename} style={{ animationDelay: `${i * 0.08}s` }}>
              <OceanAgentCard
                agent={agent}
                connected={isConnected(agent.codename)}
                onClick={() => setSelectedCodename(agent.codename)}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <div className="font-cinzel text-[9px] tracking-[0.3em] uppercase" style={{ color: '#0a1428' }}>
            cosmos-logos v1.0.3 · Ed25519 Sealed Envelopes
          </div>
        </div>
      </div>

      {/* Connect panel */}
      {selectedOcean && (
        <OceanConnectPanel
          ocean={selectedOcean}
          config={selectedConfig}
          onClose={() => setSelectedCodename(null)}
        />
      )}
    </div>
  );
}
