/**
 * Consumer hooks for the cluster context. Each hook is intentionally narrow
 * so components re-render only on the slice they care about.
 */

import React from 'react';
import {
  ClusterStateContext,
  ClusterDispatchContext,
} from './ClusterContext';
import type { ClusterAction, ClusterState } from './cluster';
import { fetchMyClusters } from '../lib/api/clusters';

function ensureState(s: ClusterState | null): ClusterState {
  if (!s) throw new Error('useCluster*: ClusterProvider not mounted');
  return s;
}

function ensureDispatch(
  d: React.Dispatch<ClusterAction> | null,
): React.Dispatch<ClusterAction> {
  if (!d) throw new Error('useClusterDispatch: ClusterProvider not mounted');
  return d;
}

/** Read the full state. Prefer a narrow selector below. */
export function useClusterState(): ClusterState {
  return ensureState(React.useContext(ClusterStateContext));
}

/** Read the dispatch fn. Stable across re-renders. */
export function useClusterDispatch(): React.Dispatch<ClusterAction> {
  return ensureDispatch(React.useContext(ClusterDispatchContext));
}

/** The URL every API client should hit. Updated immediately on cluster-change
 *  dispatches; no reload involved. */
export function useEffectiveBaseUrl(): string {
  return useClusterState().effectiveBaseUrl;
}

/** Monotonic counter — bumps every time the effective base URL changes. */
export function useEpoch(): number {
  return useClusterState().epoch;
}

/** The currently-selected cluster object (or null when on default / override). */
export function useSelectedCluster() {
  return useClusterState().selected;
}

/** Picker helper — exposes the list, loading flag, error, and a stable
 *  refresh callback. */
export function useClusterList() {
  const state = useClusterState();
  const dispatch = useClusterDispatch();
  const refresh = React.useCallback(async () => {
    dispatch({ type: 'CLUSTERS/LOAD_START' });
    try {
      const res = await fetchMyClusters();
      dispatch({ type: 'CLUSTERS/LOAD_SUCCESS', payload: res.clusters });
    } catch (e: any) {
      dispatch({ type: 'CLUSTERS/LOAD_ERROR', payload: String(e?.message || e) });
    }
  }, [dispatch]);
  return {
    clusters: state.available,
    loading: state.availableLoading,
    error: state.availableError,
    refresh,
  };
}
