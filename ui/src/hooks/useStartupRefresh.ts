import { useState, useEffect, useRef } from 'react';
import { isSalesforceConnected, refreshSalesforceToken } from '@/lib/api/salesforce-client';
import { isOlympusGridTokenPresent, refreshOlympusGridToken } from '@/lib/api/olympus-grid-client';
import { isGitHubConnected, validateGitHubToken } from '@/lib/api/github-client';
import { isGoogleConnected, isGoogleTokenExpired, refreshGoogleToken } from '@/lib/api/google-client';
import { isHubSpotConnected, validateHubSpotToken } from '@/lib/api/hubspot-client';
import { isWorkdayConnected, validateWorkdayConnection } from '@/lib/api/workday-client';
import { initializePoseidonSession } from '@/lib/mcp/poseidon-session';

export function useStartupRefresh(): { refreshing: boolean } {
  const [refreshing, setRefreshing] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const tasks: Promise<void>[] = [];

    if (isSalesforceConnected()) {
      tasks.push(
        refreshSalesforceToken()
          .then(() => console.log('[SF] Token refreshed on startup'))
          .catch((err) => console.warn('[SF] Startup refresh failed — session may require re-auth', err)),
      );
    }

    if (isOlympusGridTokenPresent()) {
      tasks.push(
        refreshOlympusGridToken()
          .then(() => console.log('[OG] Token refreshed on startup'))
          .catch((err) => console.warn('[OG] Startup refresh failed — session may require re-auth', err)),
      );
    }

    if (isGitHubConnected()) {
      tasks.push(
        validateGitHubToken()
          .then(() => console.log('[GH] Token validated on startup'))
          .catch((err) => console.warn('[GH] Startup validation failed — may require re-auth', err)),
      );
    }

    if (isGoogleConnected() && isGoogleTokenExpired()) {
      tasks.push(
        refreshGoogleToken()
          .then(() => console.log('[GOOGLE] Token refreshed on startup'))
          .catch((err) => console.warn('[GOOGLE] Startup refresh failed — may require re-auth', err)),
      );
    }

    if (isHubSpotConnected()) {
      tasks.push(
        validateHubSpotToken()
          .then(() => console.log('[HS] Token validated on startup'))
          .catch((err) => console.warn('[HS] Startup validation failed — may require re-auth', err)),
      );
    }

    if (isWorkdayConnected()) {
      tasks.push(
        validateWorkdayConnection()
          .then(() => console.log('[WD] Connection validated on startup'))
          .catch((err) => console.warn('[WD] Startup validation failed — may require re-auth', err)),
      );
    }

    if (tasks.length === 0) return;

    setRefreshing(true);
    Promise.allSettled(tasks)
      .then(() => {
        // After tokens are refreshed, initialize Poseidon MCP session
        return initializePoseidonSession().catch((err) =>
          console.warn('[MCP] Poseidon session init failed — tools may not be available', err),
        );
      })
      .finally(() => setRefreshing(false));
  }, []);

  return { refreshing };
}
