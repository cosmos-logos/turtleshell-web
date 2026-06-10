/**
 * ClusterPicker — top-bar control that routes API traffic to any Cluster
 * the signed-in Identity owns. Consumes ClusterContext; dispatches cluster-
 * mutation actions. State updates propagate to every consumer automatically;
 * components that hold cluster-bound data useEffect on `epoch` and reset.
 *
 * Tailwind-styled to match AgentPicker. Uses createPortal to escape any
 * ancestor backdrop-blur stacking context (same trick as AgentPicker).
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Server, RefreshCcw } from 'lucide-react';
import type { ClusterRow, ClusterStatus } from '@/lib/api/clusters';
import { DEFAULT_API_BASE } from '@/state/cluster';
import {
  useClusterDispatch,
  useClusterList,
  useEffectiveBaseUrl,
  useSelectedCluster,
} from '@/state/cluster-hooks';

const STATUS_CLASS: Record<ClusterStatus, string> = {
  Pending:      'bg-amber-500/15  text-amber-400  border-amber-500/30',
  Provisioning: 'bg-blue-500/15   text-blue-300   border-blue-500/30',
  Live:         'bg-green-500/15  text-green-300  border-green-500/30',
  Failed:       'bg-red-500/15    text-red-300    border-red-500/30',
  Suspended:    'bg-neutral-500/15 text-neutral-300 border-neutral-500/30',
  Destroyed:    'bg-neutral-500/15 text-neutral-300 border-neutral-500/30',
};

function StatusPill({ status }: { status: ClusterStatus }) {
  const cls = STATUS_CLASS[status] ?? STATUS_CLASS.Pending;
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-2xs font-semibold border ${cls}`}
    >
      {status}
    </span>
  );
}

function clusterMatchesBase(c: ClusterRow, base: string): boolean {
  if (!c.endpointUrl) return false;
  return c.endpointUrl.replace(/\/+$/, '') === base.replace(/\/+$/, '');
}

export default function ClusterPicker() {
  const dispatch = useClusterDispatch();
  const { clusters, loading, error, refresh } = useClusterList();
  const effectiveBase = useEffectiveBaseUrl();
  const selectedCluster = useSelectedCluster();

  const [open, setOpen] = useState(false);
  const [overrideEditing, setOverrideEditing] = useState(false);
  const [overrideValue, setOverrideValue] = useState('');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isDefault =
    effectiveBase.replace(/\/+$/, '') === DEFAULT_API_BASE.replace(/\/+$/, '');
  const usingCustom = !selectedCluster && !isDefault;

  // Outside-click close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
        setOverrideEditing(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // Compute portal position from trigger
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.right - 420, minWidth: 420 });
  }, [open]);

  function pickCluster(c: ClusterRow) {
    if (!c.endpointUrl) return;
    dispatch({ type: 'CLUSTERS/SELECT', payload: c });
    setOpen(false);
  }

  function applyOverride() {
    const trimmed = overrideValue.trim();
    if (!trimmed) return;
    dispatch({ type: 'CLUSTERS/USE_OVERRIDE', payload: trimmed });
    setOverrideEditing(false);
    setOpen(false);
  }

  function clearSelection() {
    dispatch({ type: 'CLUSTERS/CLEAR' });
    setOpen(false);
  }

  // Trigger label
  let triggerLabel: React.ReactNode;
  if (selectedCluster) {
    triggerLabel = (
      <span className="flex items-center gap-1.5 truncate">
        <span className="font-semibold truncate">{selectedCluster.clusterName}</span>
        {selectedCluster.status !== 'Live' && (
          <StatusPill status={selectedCluster.status} />
        )}
      </span>
    );
  } else if (usingCustom) {
    triggerLabel = (
      <span className="font-mono text-2xs truncate">{effectiveBase}</span>
    );
  } else {
    triggerLabel = (
      <span className="text-text-muted">Default cluster</span>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors min-w-[200px] max-w-[300px]"
        aria-label="Select cluster"
      >
        <Server size={14} className="text-text-muted flex-shrink-0" />
        <span className="text-2xs uppercase tracking-wider text-text-muted">cluster</span>
        <span className="text-sm flex-1 text-left truncate">{triggerLabel}</span>
        <ChevronDown
          size={14}
          className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: pos.top, left: Math.max(8, pos.left), minWidth: pos.minWidth, zIndex: 1000 }}
          className="bg-surface-1 border border-border-muted rounded-xl shadow-lg shadow-black/30 overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-muted">
            <span className="text-2xs uppercase tracking-wider text-text-muted">Route API traffic</span>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1 text-2xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
            >
              <RefreshCcw size={11} className={loading ? 'animate-spin' : ''} />
              {loading ? 'loading…' : 'refresh'}
            </button>
          </div>

          {/* Default row — suppressed when a registry cluster already points
              at DEFAULT_API_BASE to avoid the same URL under two labels. */}
          {!clusters.some(
            (c) =>
              c.endpointUrl?.replace(/\/+$/, '') ===
              DEFAULT_API_BASE.replace(/\/+$/, ''),
          ) && (
            <ClusterRowItem
              active={isDefault}
              onClick={clearSelection}
              title="Default cluster"
              subtitle={DEFAULT_API_BASE}
            />
          )}

          {error && (
            <div className="px-4 py-3 text-xs text-red-300">{error}</div>
          )}
          {!loading && !error && clusters.length === 0 && (
            <div className="px-4 py-3 text-xs text-text-muted">
              No clusters on this Node yet.
            </div>
          )}
          {clusters.map((c) => {
            const active = clusterMatchesBase(c, effectiveBase);
            const disabled = !c.endpointUrl;
            return (
              <ClusterRowItem
                key={c.id}
                active={active}
                disabled={disabled}
                onClick={() => pickCluster(c)}
                title={
                  <span className="flex items-center gap-2">
                    {c.clusterName}
                    <StatusPill status={c.status} />
                  </span>
                }
                subtitle={c.endpointUrl || 'endpoint not yet assigned'}
                meta={`${c.runtime} · ${c.region}`}
              />
            );
          })}

          {/* Override */}
          <div className="border-t border-border-muted px-4 py-3">
            {!overrideEditing ? (
              <button
                onClick={() => {
                  setOverrideEditing(true);
                  setOverrideValue(usingCustom ? effectiveBase : '');
                }}
                className="text-xs text-shell-400 hover:text-shell-300 transition-colors"
              >
                + Use a custom URL{usingCustom ? ' (active)' : ''}
              </button>
            ) : (
              <div>
                <div className="text-2xs uppercase tracking-wider text-text-muted mb-1">
                  Custom endpoint URL
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={overrideValue}
                    onChange={(e) => setOverrideValue(e.target.value)}
                    placeholder="https://api-acme.turtleshell.ai"
                    autoFocus
                    className="flex-1 px-2 py-1 bg-surface-2 border border-border-muted rounded text-xs font-mono text-text-primary focus:outline-none focus:border-shell-400"
                  />
                  <button
                    onClick={applyOverride}
                    disabled={!overrideValue.trim()}
                    className="px-3 py-1 bg-shell-500 hover:bg-shell-400 text-white text-xs rounded disabled:opacity-50 transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Forward-compat slot — iris admin owns spawn for now */}
          <div className="border-t border-border-muted px-4 py-2.5 flex gap-2 opacity-50">
            <button
              disabled
              title="Spawn flow lives in the iris admin portal today."
              className="px-2.5 py-1 border border-dashed border-border-muted rounded text-2xs text-text-muted cursor-not-allowed"
            >
              + Spawn cluster
            </button>
            <button
              disabled
              title="Per-cluster manage lives in iris admin today."
              className="px-2.5 py-1 border border-dashed border-border-muted rounded text-2xs text-text-muted cursor-not-allowed"
            >
              Manage…
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function ClusterRowItem({
  active,
  disabled,
  onClick,
  title,
  subtitle,
  meta,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: React.ReactNode;
  subtitle: string;
  meta?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`block w-full text-left px-4 py-2.5 border-b border-border-muted/50 transition-colors ${
        active
          ? 'bg-shell-500/10 text-shell-400'
          : disabled
            ? 'text-text-muted opacity-50 cursor-not-allowed'
            : 'hover:bg-surface-2 text-text-primary'
      }`}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className={`${active ? 'text-shell-400' : 'text-text-muted'} text-xs`}>
          {active ? '◉' : '○'}
        </span>
        {title}
      </div>
      <div className="font-mono text-2xs text-text-muted mt-1 ml-5 break-all">
        {subtitle}
      </div>
      {meta && (
        <div className="text-2xs text-text-muted/80 mt-0.5 ml-5">{meta}</div>
      )}
    </button>
  );
}
