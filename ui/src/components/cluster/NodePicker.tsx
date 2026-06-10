/**
 * NodePicker — Stage 1 of the login flow. Picks WHICH Salesforce org
 * (the Node) will mint JWTs for this session. The picked Node's Apex
 * REST URL is the direct destination for email-link request/verify,
 * Apple SIWA verify, and token refresh — none of those hit Pantheon.
 *
 * Stage 2 (cluster) lives in ClusterPicker (in the Header, gated on
 * JWT presence) and chooses the *runtime* Pantheon endpoint that
 * Athena/Apollo/Plutus traffic routes to. The two URLs are independent.
 *
 * Persisted state:
 *   - `og_node` (this file) — selected Node, via zustand persist.
 *   - `og_api_base` (ClusterPicker) — selected Cluster runtime URL.
 *
 * Switching Nodes invalidates everything: JWTs (different signing cert
 * means 401 on the next call), the previously-selected cluster (cluster
 * IDs are per-Node), and any cached cluster runtime override.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Globe, Pencil } from 'lucide-react';
import {
  useNodeStore,
  PRODUCTION_NODE,
  type NodePreset,
} from '@/lib/store/node-store';
import { useClusterDispatch } from '@/state/cluster-hooks';

const PRESETS: NodePreset[] = [PRODUCTION_NODE];

function normalize(u: string): string {
  return u.trim().replace(/\/+$/, '');
}

function findPreset(currentUrl: string): NodePreset | null {
  const n = normalize(currentUrl);
  return PRESETS.find((p) => normalize(p.identityUrl) === n) ?? null;
}

/** Clear everything Node-scoped — JWTs and the cluster runtime override.
 *  Different Node = different signing cert = stale JWT, and a Cluster
 *  selected against the old Node isn't visible from the new one. */
function clearNodeScopedState() {
  try {
    localStorage.removeItem('og_access_token');
    localStorage.removeItem('og_refresh_token');
    localStorage.removeItem('og_api_base');
    localStorage.removeItem('og_selected_cluster_id');
  } catch {
    // ignore
  }
}

export default function NodePicker() {
  const current = useNodeStore((s) => s.current);
  const setNode = useNodeStore((s) => s.setNode);
  const reset = useNodeStore((s) => s.reset);
  const clusterDispatch = useClusterDispatch();

  const [open, setOpen] = useState(false);
  const [customEditing, setCustomEditing] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const currentPreset = findPreset(current.identityUrl);
  const isCustom = !currentPreset;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
        setCustomEditing(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const [pos, setPos] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.right - 420, minWidth: 420 });
  }, [open]);

  function pickPreset(p: NodePreset) {
    clearNodeScopedState();
    clusterDispatch({ type: 'CLUSTERS/CLEAR' });
    setNode(p);
    setOpen(false);
  }

  function applyCustom() {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    clearNodeScopedState();
    clusterDispatch({ type: 'CLUSTERS/CLEAR' });
    setNode({
      key: 'custom',
      label: 'Custom',
      identityUrl: trimmed,
      description: trimmed,
    });
    setCustomEditing(false);
    setOpen(false);
  }

  function resetToDefault() {
    clearNodeScopedState();
    clusterDispatch({ type: 'CLUSTERS/CLEAR' });
    reset();
    setOpen(false);
  }

  // Trigger label
  const TriggerIcon = currentPreset ? Globe : Pencil;
  const triggerText = currentPreset?.label ?? 'Custom';

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors"
        aria-label="Select identity provider"
      >
        <TriggerIcon size={14} className="text-text-muted flex-shrink-0" />
        <span className="text-2xs uppercase tracking-wider text-text-muted">
          server
        </span>
        <span className="text-sm font-semibold">{triggerText}</span>
        <ChevronDown
          size={14}
          className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: Math.max(8, pos.left),
            minWidth: pos.minWidth,
            zIndex: 1000,
          }}
          className="bg-surface-1 border border-border-muted rounded-xl shadow-lg shadow-black/30 overflow-hidden animate-fade-in"
        >
          <div className="px-4 py-2.5 border-b border-border-muted">
            <div className="text-2xs uppercase tracking-wider text-text-muted">
              Identity provider (Salesforce)
            </div>
            <div className="text-2xs text-text-muted/70 mt-0.5">
              The Node mints your JWT. Switching signs you out — the new
              Node's signing cert won't validate the old token.
            </div>
          </div>

          {PRESETS.map((p) => (
            <NodeRow
              key={p.key}
              active={currentPreset?.key === p.key}
              onClick={() => pickPreset(p)}
              title={p.label}
              subtitle={p.description ?? p.identityUrl}
            />
          ))}

          {isCustom && (
            <NodeRow
              active
              onClick={resetToDefault}
              title="Custom (active) — reset to Production"
              subtitle={current.identityUrl}
            />
          )}

          <div className="border-t border-border-muted px-4 py-3">
            {!customEditing ? (
              <button
                onClick={() => {
                  setCustomEditing(true);
                  setCustomValue(isCustom ? current.identityUrl : '');
                }}
                className="flex items-center gap-1.5 text-xs text-shell-400 hover:text-shell-300 transition-colors"
              >
                <Pencil size={12} />
                Custom Apex REST URL{isCustom ? ' (active)' : ''}
              </button>
            ) : (
              <div>
                <div className="text-2xs uppercase tracking-wider text-text-muted mb-1">
                  Scratch org Site Apex REST URL
                </div>
                <div className="text-2xs text-text-muted/70 mb-2 font-mono break-all">
                  e.g. https://innovation-app-1234.scratch.my.site.com/portal/services/apexrest
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="https://<scratch>.scratch.my.site.com/<site>/services/apexrest"
                    autoFocus
                    className="flex-1 px-2 py-1 bg-surface-2 border border-border-muted rounded text-xs font-mono text-text-primary focus:outline-none focus:border-shell-400"
                  />
                  <button
                    onClick={applyCustom}
                    disabled={!customValue.trim()}
                    className="px-3 py-1 bg-shell-500 hover:bg-shell-400 text-white text-xs rounded disabled:opacity-50 transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function NodeRow({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left px-4 py-2.5 border-b border-border-muted/50 transition-colors ${
        active
          ? 'bg-shell-500/10 text-shell-400'
          : 'hover:bg-surface-2 text-text-primary'
      }`}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className={active ? 'text-shell-400' : 'text-text-muted'}>
          {active ? '◉' : '○'}
        </span>
        <Globe
          size={14}
          className={active ? 'text-shell-400' : 'text-text-muted'}
        />
        <span className="font-semibold">{title}</span>
      </div>
      <div className="font-mono text-2xs text-text-muted mt-1 ml-9 break-all">
        {subtitle}
      </div>
    </button>
  );
}
