/**
 * ClusterProvider — single source of truth for cluster state across the SPA.
 *
 * Wraps the React tree at App level. Exposes two contexts (state + dispatch)
 * with the standard React pattern that prevents cross-slice re-renders.
 *
 * Side-effects this provider owns:
 *  1. Syncs state to localStorage on every change, so non-React consumers
 *     (environment-store's override hook) continue to work without any
 *     subscription wiring.
 *  2. Loads the cluster list once on mount (via fetchMyClusters), so the
 *     picker dropdown is populated as soon as the user clicks it. Reload
 *     can be triggered via `refresh()` from useClusterList(). Silently
 *     no-ops when the user isn't signed in yet (no JWT in localStorage).
 *
 * Side-effects this provider does NOT own:
 *  - Page reloads. Components subscribe to the epoch counter and refetch
 *    their own data when the effective cluster changes.
 */

import React from 'react';
import {
  ClusterState,
  ClusterAction,
  clusterReducer,
  initialClusterState,
  syncClusterStateToStorage,
} from './cluster';
import { fetchMyClusters } from '../lib/api/clusters';

const ClusterStateContext = React.createContext<ClusterState | null>(null);
const ClusterDispatchContext =
  React.createContext<React.Dispatch<ClusterAction> | null>(null);

export function ClusterProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(
    clusterReducer,
    undefined,
    initialClusterState,
  );

  // Effect 1 — sync state → localStorage. Drives the env-store override hook
  // that every existing API client reads. Cheap; no debounce needed.
  React.useEffect(() => {
    syncClusterStateToStorage(state);
  }, [state.selected?.id, state.overrideUrl, state.effectiveBaseUrl]);

  // Effect 2 — load the cluster list on mount. Only attempts when a JWT
  // exists; the picker shows an "available after sign-in" empty state
  // otherwise. The picker's refresh button re-runs this on demand.
  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (typeof window === 'undefined') return;
      if (!localStorage.getItem('og_access_token')) return;
      dispatch({ type: 'CLUSTERS/LOAD_START' });
      try {
        const res = await fetchMyClusters();
        if (cancelled) return;
        dispatch({ type: 'CLUSTERS/LOAD_SUCCESS', payload: res.clusters });
      } catch (e: any) {
        if (cancelled) return;
        dispatch({
          type: 'CLUSTERS/LOAD_ERROR',
          payload: String(e?.message || e),
        });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ClusterStateContext.Provider value={state}>
      <ClusterDispatchContext.Provider value={dispatch}>
        {children}
      </ClusterDispatchContext.Provider>
    </ClusterStateContext.Provider>
  );
}

export { ClusterStateContext, ClusterDispatchContext };
