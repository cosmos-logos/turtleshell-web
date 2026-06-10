/**
 * Cluster registry client — enumerates which Cluster__c records the
 * signed-in Identity owns on the current Node.
 *
 * Calls go DIRECT to the Node's Apex REST endpoint (same plane as the
 * email-link auth and refresh calls), NOT through the picked cluster's
 * Ares gateway. The list belongs to the Node — a cluster you might
 * route runtime traffic to has no reason to vend the catalog of *other*
 * clusters available on its spawning org.
 *
 * Mirrors omens' ClusterRegistryClient.cs (engines/godot/scripts/grid/).
 * The endpoint shape `${nodeIdentityUrl}/v1/grid/clusters/me` resolves
 * to the SF Apex route Plugin.v1_grid_clusters → ApiRouteClusters.
 *
 * Switching clusters via the picker dispatches CLUSTERS/SELECT, which
 * the environment-store override hook reads on every getAthenaUrl/
 * getHermesUrl/etc. — so every runtime API client retargets to the
 * selected cluster's endpointUrl without any per-client refactor.
 */

import { useNodeStore } from '@/lib/store/node-store';

export type ClusterStatus =
  | 'Pending'
  | 'Provisioning'
  | 'Live'
  | 'Failed'
  | 'Suspended'
  | 'Destroyed';

export type ClusterRuntime =
  | 'cloudpremise-aws'
  | 'customer-aws'
  | 'customer-azure'
  | 'offgrid';

export interface ClusterRow {
  id: string;
  name: string;
  clusterName: string;
  status: ClusterStatus;
  runtime: ClusterRuntime | string;
  region: string;
  nodeNamespace?: string;
  pantheonVersion?: string;
  endpointUrl?: string;
  requestedAt?: string;
  liveAt?: string;
  errorMessage?: string;
}

export interface ClusterListResponse {
  clusters: ClusterRow[];
  count: number;
  node: string;
}

// Apex route Plugin.v1_grid_clusters → ApiRouteClusters. Called direct
// at `${nodeIdentityUrl}/v1/grid/clusters/me` — no Ares forwarder
// involved.
const CLUSTERS_PATH = '/v1/grid/clusters/me';

function buildHeaders(): Record<string, string> | null {
  const jwt = localStorage.getItem('og_access_token');
  if (!jwt) return null;
  return {
    'x-user-identity': jwt,
    'content-type': 'application/json',
  };
}

export async function fetchMyClusters(): Promise<ClusterListResponse> {
  const headers = buildHeaders();
  if (!headers) {
    throw new Error('Not signed in — cannot enumerate clusters');
  }
  const base = useNodeStore.getState().getIdentityUrl();
  const url = `${base}${CLUSTERS_PATH}`;
  const res = await fetch(url, {
    method: 'GET',
    // credentials: 'omit' — direct-to-Apex auth uses x-user-identity
    // (header), not cookies. SF CORS responses set Allow-Credentials:
    // false on Apex REST, so 'include' would trigger a preflight-creds
    // mismatch and block the response.
    credentials: 'omit',
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Cluster list failed: ${res.status}${text ? ' — ' + text.slice(0, 200) : ''}`,
    );
  }
  const data = await res.json();
  const payload = data.result ?? data;
  return {
    clusters: (payload.clusters || []) as ClusterRow[],
    count: Number(payload.count ?? 0),
    node: String(payload.node ?? ''),
  };
}
