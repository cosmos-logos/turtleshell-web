import { useState, useEffect, useCallback, useRef } from 'react';
import { useEnvironmentStore, applyClusterOverride } from '@/lib/store/environment-store';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';

const POLL_INTERVAL = 30_000; // 30s

export interface AgentHealth {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  latency?: number;
  details?: Record<string, unknown>;
}

export type ConnectionState = 'checking' | 'online' | 'partial' | 'offline';

export function useAgentStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [agentHealths, setAgentHealths] = useState<AgentHealth[]>([]);
  const [lastChecked, setLastChecked] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const developerMode = useEnvironmentStore((s) => s.developerMode);
  const cosmosAgents = useCosmosLogosStore((s) => s.agents);

  const checkStatus = useCallback(async () => {
    if (!developerMode || cosmosAgents.length === 0) {
      setConnectionState('offline');
      setAgentHealths([]);
      return;
    }

    const results = await Promise.all(
      cosmosAgents.map(async (agent): Promise<AgentHealth> => {
        const name = agent.displayName || agent.manifest.identity.name;
        const healthPath = agent.manifest.network?.health || '/health';
        // agent.url is captured-at-connect; retarget to the currently
        // active cluster so health pings hit the same Pantheon the
        // chat client is talking to.
        const healthUrl = `${applyClusterOverride(agent.url)}${healthPath}`;
        const start = performance.now();
        try {
          const resp = await fetch(healthUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(8000),
          });
          const latency = Math.round(performance.now() - start);
          if (!resp.ok) return { id: agent.id, name, url: agent.url, status: 'offline' };
          let details: Record<string, unknown> | undefined;
          try { details = await resp.json(); } catch {}
          return { id: agent.id, name, url: agent.url, status: 'online', latency, details };
        } catch {
          return { id: agent.id, name, url: agent.url, status: 'offline' };
        }
      })
    );

    setAgentHealths(results);
    const onlineCount = results.filter(r => r.status === 'online').length;
    if (onlineCount === results.length) setConnectionState('online');
    else if (onlineCount > 0) setConnectionState('partial');
    else setConnectionState('offline');
    setLastChecked(Date.now());
  }, [developerMode, cosmosAgents]);

  useEffect(() => {
    if (!developerMode || cosmosAgents.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = undefined;
      setConnectionState('offline');
      setAgentHealths([]);
      return;
    }

    checkStatus();
    timerRef.current = setInterval(checkStatus, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [checkStatus, developerMode, cosmosAgents.length]);

  return { connectionState, agentHealths, lastChecked, refresh: checkStatus };
}
