import { useCosmosLogosStore } from './store';
import { useEnvironmentStore } from '@/lib/store/environment-store';

/**
 * Auto-connect the Athena cosmos-logos agent on app boot.
 *
 * Athena is the gateway to every frontier model and is part of the core
 * Olympus-616 stack — it should always be available unless the user has
 * explicitly disconnected it. We respect explicit disconnects via a
 * localStorage flag set by the cosmos store's removeAgent path.
 *
 * The target Athena is chosen from the environment store (cloud / offgrid /
 * local / custom). Previously this was hardcoded to the cloud prod URL,
 * which made development against the local fleet impossible: a dev on
 * localhost would auto-connect to api-int.turtleshell.ai, get CORS-blocked,
 * and end up with no working Athena. Using the env store's getAthenaUrl()
 * lets dev, cloud, and off-grid flows all work with the same code path.
 *
 * Environment labels ('cloud' / 'offgrid' / 'local') are stored on the
 * cosmos-logos agent record so the sidebar/agent-scope plumbing can still
 * distinguish between instances if needed.
 */

const ATHENA_CODENAME = 'athena-616';
const DISCONNECT_FLAG = 'turtleshell-athena-disconnected';

export async function autoConnectAthena(): Promise<void> {
  // Respect manual disconnect
  if (localStorage.getItem(DISCONNECT_FLAG) === '1') {
    console.log('[Athena] Auto-connect skipped — user previously disconnected');
    return;
  }

  const store = useCosmosLogosStore.getState();

  // Already connected (by codename)
  if (store.agents.some(a => a.manifest.identity.codename === ATHENA_CODENAME)) {
    console.log('[Athena] Already connected — skipping auto-connect');
    return;
  }

  const env = useEnvironmentStore.getState();
  const athenaBase = env.getAthenaUrl();
  if (!athenaBase) {
    console.warn('[Athena] Auto-connect skipped — no Athena URL configured');
    return;
  }

  // Resolve an absolute URL for the manifest fetch so both absolute cloud
  // URLs and relative dev/offgrid paths (proxied by the dev server) work.
  const manifestUrl = athenaBase.startsWith('http')
    ? `${athenaBase}/.well-known/cosmos-logos.json`
    : `${window.location.origin}${athenaBase}/.well-known/cosmos-logos.json`;

  try {
    const resp = await fetch(manifestUrl, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) {
      console.warn('[Athena] Manifest fetch failed:', resp.status, 'from', manifestUrl);
      return;
    }
    const manifest = await resp.json();
    // Pass the env-store base so `cosmosAgent.url` used by chat-client resolves
    // to the same path the rest of the app uses (avoids split-brain between
    // Logos/Cosmos wrappers and the cosmos-logos Athena agent).
    store.addAgent(athenaBase, manifest, 'Athena', env.current);
    console.log('[Athena] Auto-connected via', env.current, '→', athenaBase);
  } catch (err) {
    console.warn('[Athena] Auto-connect failed:', err, 'url:', manifestUrl);
  }
}

/** Mark Athena as manually disconnected so we don't auto-reconnect on next boot. */
export function markAthenaDisconnected(): void {
  localStorage.setItem(DISCONNECT_FLAG, '1');
}

/** Clear the manual-disconnect flag (e.g. when user explicitly reconnects). */
export function clearAthenaDisconnectFlag(): void {
  localStorage.removeItem(DISCONNECT_FLAG);
}
