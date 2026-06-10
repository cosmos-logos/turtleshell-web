/**
 * Node-level session log — off-grid surface only.
 *
 * On a TurtleShell off-grid appliance the SPA lives at the same origin as
 * the status server (Express on :717). That server has its own JSONL session
 * log of every request flowing through the box (proxy traffic, dashboard
 * calls, container health). When a user submits feedback we attach this
 * node-level log alongside the browser session log so admins can debug
 * issues that originate in the local fleet, not just the browser.
 *
 * Graceful degradation: when running anywhere except an off-grid host
 * (turtleshell.ai cloud, localhost dev), the /api/session-log/* endpoints
 * don't exist; we silently return null and the feedback submit proceeds
 * with browser-only context.
 */

import { useEnvironmentStore } from '@/lib/store/environment-store';

const NODE_LOG_CURRENT = '/api/session-log/current';
const NODE_LOG_DOWNLOAD = '/api/session-log/download';

interface NodeSessionInfo {
  sessionId: string;
  startedAt: string;
  size: number;
  lines: number;
}

/**
 * Off-grid surfaces share the same origin as the offgrid Express server.
 * Cloud surfaces (turtleshell.ai) don't — calling /api/session-log there
 * would 404. Use the persisted environment selection to gate the fetch.
 */
function isOffgridContext(): boolean {
  const env = useEnvironmentStore.getState().current;
  return env === 'offgrid';
}

/** Returns true if the node-level session-log endpoints are reachable. */
export async function nodeSessionLogAvailable(): Promise<NodeSessionInfo | null> {
  if (!isOffgridContext()) return null;
  try {
    const res = await fetch(NODE_LOG_CURRENT, { credentials: 'include' });
    if (!res.ok) return null;
    return (await res.json()) as NodeSessionInfo;
  } catch {
    return null;
  }
}

/**
 * Fetches the active node session log as plain JSONL text. Returns null when
 * not on an off-grid host or when the endpoint isn't available. Cheap on
 * cloud — early-exits before any network call.
 */
export async function fetchNodeSessionLog(): Promise<string | null> {
  if (!isOffgridContext()) return null;
  try {
    const res = await fetch(NODE_LOG_DOWNLOAD, { credentials: 'include' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Builds a divider line that admins viewing the combined session log can
 * easily grep for to find where the offgrid-node stream begins. Stays inside
 * the JSONL envelope so the file remains a single valid JSONL document.
 */
export function nodeSessionLogDivider(info: NodeSessionInfo | null): string {
  return JSON.stringify({
    divider: '--- offgrid-node-session-log ---',
    sessionId: info?.sessionId ?? null,
    startedAt: info?.startedAt ?? null,
    capturedAt: new Date().toISOString(),
  });
}
