/**
 * Node store — which Salesforce org issues identity for this session.
 *
 * Mirrors omens' BackendEndpoint + IdentityNode (engines/godot/scripts/
 * auth/BackendEndpoint.cs / IdentityNode.cs). The Node is the SF Site
 * whose Apex REST endpoint mints JWTs for the email-link and Apple SIWA
 * flows. It is pinned for the lifetime of the session and is the target
 * for /token/session/refresh.
 *
 * Crucially separate from the Cluster (which lives in cluster.ts /
 * og_api_base): the Cluster is the *runtime* Pantheon a logged-in user
 * routes Athena/Apollo/Plutus traffic to, but identity is always issued
 * by the Node — switching clusters does NOT change who minted the JWT.
 *
 * Storage: localStorage key `og_node` (zustand persist envelope). Reset
 * to Production when the user picks "Default" or when the store
 * initializes for the first time.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NodePreset {
  /** Stable key used for preset matching in the picker. */
  key: 'production' | 'custom';
  /** Short label shown on the picker trigger. */
  label: string;
  /**
   * Full Apex REST URL for the Node. Includes the namespace segment
   * when the Node is a managed package (production: `og_node_beta_1`),
   * omitted for `--no-namespace` scratch orgs. Examples:
   *   https://app.olympus-grid.com/services/apexrest/og_node_beta_1
   *   https://innovation-app-8526.scratch.my.site.com/portal/services/apexrest
   */
  identityUrl: string;
  /** Subtitle line shown in the picker row. */
  description?: string;
}

export const PRODUCTION_NODE: NodePreset = {
  key: 'production',
  label: 'Production',
  identityUrl: 'https://app.olympus-grid.com/services/apexrest/og_node_beta_1',
  description: 'app.olympus-grid.com (alpha-org)',
};

interface NodeStore {
  /** The Node currently issuing identity for this session. */
  current: NodePreset;
  /** Replace the active Node. Caller is responsible for clearing JWTs
   *  and the cluster runtime override BEFORE calling this — the new
   *  Node mints with a different signing cert, so any cached JWT will
   *  401 on the next call against the new Apex. */
  setNode: (node: NodePreset) => void;
  /** Reset to PRODUCTION_NODE. */
  reset: () => void;
  /** Read the current Node's identity URL, trailing slash stripped.
   *  Safe to call from non-React code (auth helpers, fetch clients). */
  getIdentityUrl: () => string;
}

function normalize(u: string): string {
  return u.trim().replace(/\/+$/, '');
}

export const useNodeStore = create<NodeStore>()(
  persist(
    (set, get) => ({
      current: PRODUCTION_NODE,
      setNode: (node) =>
        set({
          current: { ...node, identityUrl: normalize(node.identityUrl) },
        }),
      reset: () => set({ current: PRODUCTION_NODE }),
      getIdentityUrl: () => normalize(get().current.identityUrl),
    }),
    {
      name: 'og_node',
      version: 1,
    },
  ),
);
