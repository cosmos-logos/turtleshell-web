// ── Workday Basic Auth Client ────────────────────────────────
// Uses x-workday-user, x-workday-password, x-workday-endpoint
// headers for Poseidon MCP tool calls.
// Basic Auth: Base64(username:password)
// All API calls relayed through Hermes to bypass browser CORS.
//
// NOTE: Storing password in localStorage is acceptable for this
// testing phase. In production, move to a secure credential store
// or re-prompt on each session.

import { useEnvironmentStore } from '@/lib/store/environment-store';

function getHermesUrl(): string {
  return useEnvironmentStore.getState().getHermesUrl();
}

// ── Types ────────────────────────────────────────────────────

export interface WorkdayAccount {
  endpoint: string;
  username: string;
  tenant: string;
}

// ── Basic Auth helpers ───────────────────────────────────────

export function buildBasicAuthHeader(username: string, password: string): string {
  return 'Basic ' + btoa(username + ':' + password);
}

function extractTenant(endpointUrl: string): string {
  try {
    const url = new URL(endpointUrl);
    // Workday URLs typically contain tenant in subdomain or path
    // e.g. https://wd2-impl-services1.workday.com/ccx/service/tenant_name/...
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Look for tenant after 'service' or 'api'
    const serviceIdx = pathParts.indexOf('service');
    if (serviceIdx >= 0 && pathParts[serviceIdx + 1]) {
      return pathParts[serviceIdx + 1] as string;
    }
    const apiIdx = pathParts.indexOf('api');
    if (apiIdx >= 0 && pathParts[apiIdx + 1]) {
      return pathParts[apiIdx + 1] as string;
    }
    // Fallback: use hostname
    return url.hostname.split('.')[0] as string;
  } catch {
    return 'unknown';
  }
}

// ── Hermes-relayed fetch helper ──────────────────────────────

async function wdRelay(
  path: string,
  username: string,
  password: string,
  options?: RequestInit,
): Promise<Response> {
  const url = `${getHermesUrl()}/workday/${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-workday-user': username,
      'x-workday-password': password,
      ...(options?.headers || {}),
    },
  });
}

// ── Test & Connect ───────────────────────────────────────────

export async function testConnection(
  endpointUrl: string,
  username: string,
  password: string,
): Promise<WorkdayAccount> {
  console.log('[WD] Testing connection to:', endpointUrl);

  // POST to Hermes relay with endpoint in body (avoids URL encoding issues)
  const res = await wdRelay('test', username, password, {
    method: 'POST',
    body: JSON.stringify({ endpoint: endpointUrl }),
  });

  if (res.status === 401 || res.status === 403) {
    console.error('[WD] Auth failed:', res.status);
    throw new Error('wd_auth_failed');
  }

  // SOAP endpoints may return 404/405 for GET — that still proves connectivity + auth.
  // Only network errors (502 from relay) or auth failures are real problems.
  if (res.status === 502) {
    console.error('[WD] Connection failed: could not reach endpoint');
    throw new Error('wd_connection_failed');
  }

  console.log('[WD] Endpoint reachable, status:', res.status);
  const tenant = extractTenant(endpointUrl);

  localStorage.setItem('wd_auth_type', 'basic');
  localStorage.setItem('wd_endpoint_url', endpointUrl);
  localStorage.setItem('wd_username', username);
  localStorage.setItem('wd_password', password);
  localStorage.setItem('wd_tenant', tenant);

  const account: WorkdayAccount = { endpoint: endpointUrl, username, tenant };
  console.log('[WD] Connected to tenant:', tenant);
  return account;
}

// ── Auth Header ──────────────────────────────────────────────

export function getWorkdayAuthHeader(): string {
  const username = localStorage.getItem('wd_username');
  const password = localStorage.getItem('wd_password');
  if (!username || !password) return '';
  return buildBasicAuthHeader(username, password);
}

// ── Disconnect ───────────────────────────────────────────────

export function disconnectWorkday(): void {
  localStorage.removeItem('wd_auth_type');
  localStorage.removeItem('wd_endpoint_url');
  localStorage.removeItem('wd_username');
  localStorage.removeItem('wd_password');
  localStorage.removeItem('wd_tenant');
  console.log('[WD] Disconnected');
}

// ── Status ───────────────────────────────────────────────────

export function isWorkdayConnected(): boolean {
  return !!localStorage.getItem('wd_endpoint_url');
}

export function getStoredWorkdayAccount(): WorkdayAccount | null {
  const endpoint = localStorage.getItem('wd_endpoint_url');
  if (!endpoint) return null;
  return {
    endpoint,
    username: localStorage.getItem('wd_username') ?? '',
    tenant: localStorage.getItem('wd_tenant') ?? '',
  };
}

// ── Startup Validation ───────────────────────────────────────

export async function validateWorkdayConnection(): Promise<void> {
  const endpoint = localStorage.getItem('wd_endpoint_url');
  const username = localStorage.getItem('wd_username');
  const password = localStorage.getItem('wd_password');
  if (!endpoint || !username || !password) return;

  console.log('[WD] Validating stored credentials...');
  try {
    const res = await wdRelay('test', username, password, {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });

    if (res.status === 401 || res.status === 403) {
      console.warn('[WD] Stored credentials invalid — clearing');
      disconnectWorkday();
      return;
    }

    console.log('[WD] Credentials valid');
  } catch (err) {
    console.warn('[WD] Validation failed — session may require re-auth', err);
  }
}

// ── Connection Test ──────────────────────────────────────────

export interface WdTestStep {
  label: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
  durationMs: number;
}

export interface WdTestConnectionResult {
  overall: 'pass' | 'fail';
  steps: WdTestStep[];
}

export async function testWorkdayConnection(): Promise<WdTestConnectionResult> {
  const steps: WdTestStep[] = [];
  const endpoint = localStorage.getItem('wd_endpoint_url');
  const username = localStorage.getItem('wd_username');
  const password = localStorage.getItem('wd_password');

  console.log('[WD] TEST -- Connection Test Start --');

  if (!endpoint || !username || !password) {
    steps.push({ label: 'Credentials check', status: 'fail', detail: 'Missing endpoint, username, or password', durationMs: 0 });
    return { overall: 'fail', steps };
  }

  // 1. Endpoint reachability + auth
  const t0 = performance.now();
  try {
    const res = await wdRelay('test', username, password, {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
    const ms = Math.round(performance.now() - t0);

    if (res.status === 401 || res.status === 403) {
      steps.push({ label: 'Authentication', status: 'fail', detail: `${res.status}: Invalid credentials`, durationMs: ms });
    } else if (res.status === 502) {
      steps.push({ label: 'Connectivity', status: 'fail', detail: `Could not reach endpoint`, durationMs: ms });
    } else {
      // SOAP endpoints return 404/405 for GET — that's fine, proves reachability + auth
      steps.push({ label: 'Authentication', status: 'pass', detail: `Reachable (${res.status}, ${ms}ms)`, durationMs: ms });
    }
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    steps.push({ label: 'Authentication', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  // 2. Tenant extraction
  const tenant = extractTenant(endpoint);
  steps.push({ label: 'Tenant', status: tenant !== 'unknown' ? 'pass' : 'skip', detail: tenant, durationMs: 0 });

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[WD] TEST -- Connection Test ${overall.toUpperCase()} --`, steps);
  return { overall, steps };
}
