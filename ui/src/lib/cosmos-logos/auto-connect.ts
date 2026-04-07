import { useCosmosLogosStore } from './store';

/**
 * Auto-connect the cloud Athena cosmos-logos agent on app boot.
 *
 * Athena is the gateway to every frontier model and is part of the core
 * Olympus-616 stack — it should always be available unless the user has
 * explicitly disconnected it. We respect explicit disconnects via a
 * localStorage flag set by the cosmos store's removeAgent path.
 *
 * The manifest's `network.endpoint` may point at the off-grid ngrok URL
 * even when fetched from cloud (because the manifest is hardcoded for local
 * dev). We override the URL with the explicit cloud route.
 */

const CLOUD_ATHENA_BASE = 'https://api-int.turtleshell.ai/v1/athena';
const CLOUD_ATHENA_MANIFEST = `${CLOUD_ATHENA_BASE}/.well-known/cosmos-logos.json`;
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

  try {
    const resp = await fetch(CLOUD_ATHENA_MANIFEST, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) {
      console.warn('[Athena] Manifest fetch failed:', resp.status);
      return;
    }
    const manifest = await resp.json();
    // Use the cloud URL explicitly — manifest endpoint may point at off-grid
    store.addAgent(CLOUD_ATHENA_BASE, manifest, 'Athena', 'cloud');
    console.log('[Athena] Auto-connected — cloud cosmos-logos agent');
  } catch (err) {
    console.warn('[Athena] Auto-connect failed:', err);
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
