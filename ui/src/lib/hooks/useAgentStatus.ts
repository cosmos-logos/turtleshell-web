import { useState, useEffect, useCallback, useRef } from 'react';
import { useEnvironmentStore } from '@/lib/store/environment-store';

const POLL_INTERVAL = 15_000; // 15s

export interface AgentStatus {
  service: string;
  title: string;
  domain: string;
  version: string;
  status: string;
  uptime: string;
  bootTime: string;
  environment: string;
  port: number;
  pantheon: string;
  layer: string;
  [key: string]: unknown;
}

export type ConnectionState = 'checking' | 'online' | 'offline';

export function useAgentStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [lastChecked, setLastChecked] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const checkStatus = useCallback(async () => {
    const { getBaseUrl, developerMode } = useEnvironmentStore.getState();
    const baseUrl = getBaseUrl();

    // Only poll when developer mode is on
    if (!developerMode) {
      setConnectionState('offline');
      setAgentStatus(null);
      return;
    }

    if (!baseUrl) {
      setConnectionState('offline');
      setAgentStatus(null);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/status`, {
        method: 'GET',
        headers: { 'x-developer-key': 'ts-web-int-2026' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setAgentStatus(data);
      setConnectionState('online');
    } catch {
      setConnectionState('offline');
      setAgentStatus(null);
    }
    setLastChecked(Date.now());
  }, []);

  // Re-subscribe when developerMode changes
  const developerMode = useEnvironmentStore((s) => s.developerMode);

  useEffect(() => {
    if (!developerMode) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = undefined;
      setConnectionState('offline');
      setAgentStatus(null);
      return;
    }

    checkStatus();
    timerRef.current = setInterval(checkStatus, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [checkStatus, developerMode]);

  return { connectionState, agentStatus, lastChecked, refresh: checkStatus };
}
