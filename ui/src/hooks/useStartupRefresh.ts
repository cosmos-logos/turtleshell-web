import { useState, useEffect, useRef } from 'react';
import { isSalesforceConnected, refreshSalesforceToken } from '@/lib/api/salesforce-client';
import { isOlympusGridTokenPresent, refreshOlympusGridToken } from '@/lib/api/olympus-grid-client';
import { isGitHubConnected, validateGitHubToken } from '@/lib/api/github-client';
import { isGoogleConnected, isGoogleTokenExpired, refreshGoogleToken } from '@/lib/api/google-client';
import { isHubSpotConnected, validateHubSpotToken } from '@/lib/api/hubspot-client';
import { autoConnectAthena, autoConnectCosmos, autoConnectLogos } from '@/lib/cosmos-logos/auto-connect';
import { restoreGuideAgentFromProfile } from '@/lib/apply-guide-agent';
// Workday deprecated — coming_soon until httpOnly cookie migration
// import { isWorkdayConnected, validateWorkdayConnection } from '@/lib/api/workday-client';
export function useStartupRefresh(): { refreshing: boolean } {
  const [refreshing, setRefreshing] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const tasks: Promise<void>[] = [];

    // Auto-connect the three core cosmos-logos agents. All three share the
    // Athena chat endpoint — the only runtime difference is which bundled
    // manifest (system_prompt + voice) is active. See
    // `lib/cosmos-logos/auto-connect.ts` for the bundled-agent contract.
    tasks.push(autoConnectAthena());
    tasks.push(autoConnectCosmos());
    tasks.push(autoConnectLogos());

    if (isSalesforceConnected()) {
      tasks.push(
        refreshSalesforceToken()
          .then(() => console.log('[SF] Token refreshed on startup'))
          .catch((err) => console.warn('[SF] Startup refresh failed — session may require re-auth', err)),
      );
    }

    // isOlympusGridTokenPresent() now checks olympus_grid_email as a proxy
    if (isOlympusGridTokenPresent()) {
      tasks.push(
        refreshOlympusGridToken()
          .then(() => console.log('[OG] Token refreshed on startup'))
          .catch((err) => console.warn('[OG] Startup refresh failed — session may require re-auth', err)),
      );
      // Re-apply the server-side guideAgent choice on every boot. This is
      // the authoritative source for "which of Athena/Cosmos/Logos is mine"
      // and also heals legacy local state (e.g., pre-fix onboarding that
      // hid the wrong builtin IDs, leaving cosmos-logos cousins masked).
      // Fire-and-forget; failure degrades to the default local state.
      const email = localStorage.getItem('olympus_grid_email') || '';
      if (email) {
        tasks.push(
          restoreGuideAgentFromProfile(email)
            .catch((err) => console.warn('[guide-agent] Restore on startup failed', err)),
        );
      }
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

    // Workday deprecated — coming_soon until httpOnly cookie migration
    // if (isWorkdayConnected()) {
    //   tasks.push(
    //     validateWorkdayConnection()
    //       .then(() => console.log('[WD] Connection validated on startup'))
    //       .catch((err) => console.warn('[WD] Startup validation failed — may require re-auth', err)),
    //   );
    // }

    setRefreshing(true);
    Promise.allSettled(tasks)
      .finally(() => setRefreshing(false));
  }, []);

  return { refreshing };
}
