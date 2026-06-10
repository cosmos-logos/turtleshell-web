/**
 * Cluster state — types, reducer, action factories, and initial-state hydration.
 *
 * Single source of truth for **which cluster the SPA is currently routing its
 * API traffic to**. Ported from iris/reactforce/olympus-grid-ai/src/state/
 * cluster.ts. Same Redux-style discipline: discriminated-union action types,
 * pure reducer, no side effects inside reducer.
 *
 * Components that consume the effective URL should also useEffect on `epoch`
 * — that's how a chat panel knows to drop conversation state when the user
 * switches the underlying cluster.
 */

import type { ClusterRow } from '../lib/api/clusters';

// Brand-default cluster URL. Matches the env-store 'cloud' preset's gateway
// origin. Kept here so the reducer is self-contained and doesn't have to
// reach into the env-store on every action.
export const DEFAULT_API_BASE = 'https://api-int.turtleshell.ai';

export const STORAGE_API_BASE = 'og_api_base';
export const STORAGE_SELECTED_CLUSTER = 'og_selected_cluster_id';

export interface ClusterState {
  /** All clusters this Identity owns on the current Node — populated from
   *  /v1/grid/clusters/me. Empty until first load completes. */
  available: ClusterRow[];

  /** Loading flag for the picker's cluster-list fetch. */
  availableLoading: boolean;

  /** Last error from the cluster-list fetch (null when clean). */
  availableError: string | null;

  /** Currently-selected cluster from the available list. null when on the
   *  default URL or using a custom override. */
  selected: ClusterRow | null;

  /** Developer-supplied URL override. Takes precedence over selected. null
   *  when not in override mode. */
  overrideUrl: string | null;

  /** The URL every API client should hit. Derived from selected/override/
   *  default, but stored explicitly so consumers don't have to recompute. */
  effectiveBaseUrl: string;

  /** Monotonic counter — increments every time effectiveBaseUrl changes.
   *  Components useEffect([epoch]) to know when to refetch / reset state. */
  epoch: number;
}

export type ClusterAction =
  | { type: 'CLUSTERS/LOAD_START' }
  | { type: 'CLUSTERS/LOAD_SUCCESS'; payload: ClusterRow[] }
  | { type: 'CLUSTERS/LOAD_ERROR'; payload: string }
  | { type: 'CLUSTERS/SELECT'; payload: ClusterRow }
  | { type: 'CLUSTERS/USE_OVERRIDE'; payload: string }
  | { type: 'CLUSTERS/CLEAR' };

// ── Hydration ───────────────────────────────────────────────────────────────

function readInitialBaseUrl(): { effective: string } {
  if (typeof window === 'undefined') {
    return { effective: DEFAULT_API_BASE };
  }
  try {
    const stored = localStorage.getItem(STORAGE_API_BASE);
    if (stored?.trim()) return { effective: stored.trim() };
  } catch {
    // ignore
  }
  return { effective: DEFAULT_API_BASE };
}

export function initialClusterState(): ClusterState {
  const { effective } = readInitialBaseUrl();
  return {
    available: [],
    availableLoading: false,
    availableError: null,
    selected: null, // resolved by post-load reconciliation in the provider
    overrideUrl: null,
    effectiveBaseUrl: effective,
    epoch: 0,
  };
}

// ── Reducer ─────────────────────────────────────────────────────────────────

function bumpEpoch(state: ClusterState, nextEffective: string): number {
  const normalized = nextEffective.replace(/\/+$/, '');
  return normalized === state.effectiveBaseUrl.replace(/\/+$/, '')
    ? state.epoch
    : state.epoch + 1;
}

export function clusterReducer(
  state: ClusterState,
  action: ClusterAction,
): ClusterState {
  switch (action.type) {
    case 'CLUSTERS/LOAD_START':
      return { ...state, availableLoading: true, availableError: null };

    case 'CLUSTERS/LOAD_SUCCESS': {
      const available = action.payload;
      // Reconcile a previously-selected cluster ID (from localStorage) with
      // the freshly-loaded list. If the URL the user had picked matches one
      // of the rows, mark it selected so the picker trigger shows the name
      // instead of just the URL.
      let selected: ClusterRow | null = state.selected;
      if (!selected && state.effectiveBaseUrl !== DEFAULT_API_BASE) {
        const match = available.find(
          (c) =>
            (c.endpointUrl || '').replace(/\/+$/, '') ===
            state.effectiveBaseUrl.replace(/\/+$/, ''),
        );
        if (match) selected = match;
      }
      return {
        ...state,
        available,
        availableLoading: false,
        availableError: null,
        selected,
      };
    }

    case 'CLUSTERS/LOAD_ERROR':
      return {
        ...state,
        available: [],
        availableLoading: false,
        availableError: action.payload,
      };

    case 'CLUSTERS/SELECT': {
      const c = action.payload;
      if (!c.endpointUrl) return state;
      const nextEffective = c.endpointUrl.replace(/\/+$/, '');
      return {
        ...state,
        selected: c,
        overrideUrl: null,
        effectiveBaseUrl: nextEffective,
        epoch: bumpEpoch(state, nextEffective),
      };
    }

    case 'CLUSTERS/USE_OVERRIDE': {
      const url = action.payload.trim().replace(/\/+$/, '');
      if (!url) return state;
      return {
        ...state,
        selected: null,
        overrideUrl: url,
        effectiveBaseUrl: url,
        epoch: bumpEpoch(state, url),
      };
    }

    case 'CLUSTERS/CLEAR':
      return {
        ...state,
        selected: null,
        overrideUrl: null,
        effectiveBaseUrl: DEFAULT_API_BASE,
        epoch: bumpEpoch(state, DEFAULT_API_BASE),
      };

    default:
      return state;
  }
}

// ── Side-effect helper: write the effective state to localStorage so non-
//    React code (env-store override hook, ad-hoc fetch helpers) pick up
//    the new base URL on their next call without any subscription. ─────────

export function syncClusterStateToStorage(state: ClusterState): void {
  if (typeof window === 'undefined') return;
  try {
    if (state.selected?.endpointUrl) {
      localStorage.setItem(
        STORAGE_API_BASE,
        state.selected.endpointUrl.replace(/\/+$/, ''),
      );
      localStorage.setItem(STORAGE_SELECTED_CLUSTER, state.selected.id);
    } else if (state.overrideUrl) {
      localStorage.setItem(STORAGE_API_BASE, state.overrideUrl.replace(/\/+$/, ''));
      localStorage.removeItem(STORAGE_SELECTED_CLUSTER);
    } else {
      localStorage.removeItem(STORAGE_API_BASE);
      localStorage.removeItem(STORAGE_SELECTED_CLUSTER);
    }
  } catch {
    // ignore
  }
}
