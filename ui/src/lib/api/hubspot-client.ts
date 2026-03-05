// ── HubSpot Private App Token Client ─────────────────────────
// Uses x-hubspot-api-key header for Poseidon MCP tool calls.
// HubSpot Private Apps use a static Bearer token (no OAuth flow).
// All API calls are relayed through Hermes to bypass browser CORS.

import { useEnvironmentStore } from '@/lib/store/environment-store';

function getHermesUrl(): string {
  return useEnvironmentStore.getState().getHermesUrl();
}

// ── Types ────────────────────────────────────────────────────

export interface HubSpotAccount {
  portalId: string;
  companyName: string;
  domain: string;
}

// ── Hermes-relayed fetch helper ──────────────────────────────

async function hsRelay(path: string, token: string, options?: RequestInit): Promise<Response> {
  const url = `${getHermesUrl()}/hubspot/${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-hubspot-api-key': token,
      ...(options?.headers || {}),
    },
  });
}

// ── Token Validation ─────────────────────────────────────────

export async function validateAndStoreToken(apiKey: string): Promise<HubSpotAccount> {
  console.log('[HS] Validating Private App token...');

  const res = await hsRelay('account-info/v3/details', apiKey);

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const msg = json?.message || `HubSpot returned ${res.status}`;
    console.error('[HS] Token validation failed:', msg);
    throw new Error(msg);
  }

  const json = await res.json();

  localStorage.setItem('hs_access_token', apiKey);
  localStorage.setItem('hs_portal_id', String(json.portalId));
  localStorage.setItem('hs_company_name', json.companyDomain ?? json.accountType ?? '');
  localStorage.setItem('hs_domain', json.uiDomain ?? '');

  const account: HubSpotAccount = {
    portalId: String(json.portalId),
    companyName: json.companyDomain ?? json.accountType ?? '',
    domain: json.uiDomain ?? '',
  };

  console.log('[HS] Token validated — portal:', account.portalId);
  return account;
}

// ── Disconnect ───────────────────────────────────────────────

export function disconnectHubSpot(): void {
  localStorage.removeItem('hs_access_token');
  localStorage.removeItem('hs_portal_id');
  localStorage.removeItem('hs_company_name');
  localStorage.removeItem('hs_domain');
  console.log('[HS] Disconnected');
}

// ── Status ───────────────────────────────────────────────────

export function isHubSpotConnected(): boolean {
  return !!localStorage.getItem('hs_access_token');
}

export function getStoredHubSpotAccount(): HubSpotAccount | null {
  const portalId = localStorage.getItem('hs_portal_id');
  if (!portalId) return null;
  return {
    portalId,
    companyName: localStorage.getItem('hs_company_name') ?? '',
    domain: localStorage.getItem('hs_domain') ?? '',
  };
}

// ── Startup Validation ───────────────────────────────────────

export async function validateHubSpotToken(): Promise<void> {
  const token = localStorage.getItem('hs_access_token');
  if (!token) return;

  console.log('[HS] Validating stored token...');
  try {
    const res = await hsRelay('account-info/v3/details', token);

    if (res.status === 401) {
      console.warn('[HS] Stored token is invalid — clearing');
      disconnectHubSpot();
      return;
    }

    const json = await res.json();
    localStorage.setItem('hs_portal_id', String(json.portalId));
    localStorage.setItem('hs_company_name', json.companyDomain ?? json.accountType ?? '');
    localStorage.setItem('hs_domain', json.uiDomain ?? '');
    console.log('[HS] Token valid — portal:', json.portalId);
  } catch (err) {
    console.warn('[HS] Token validation failed — session may require re-auth', err);
  }
}

// ── Connection Test ──────────────────────────────────────────

export interface HsTestStep {
  label: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
  durationMs: number;
}

export interface HsTestConnectionResult {
  overall: 'pass' | 'fail';
  steps: HsTestStep[];
}

export async function testHubSpotConnection(): Promise<HsTestConnectionResult> {
  const steps: HsTestStep[] = [];
  const token = localStorage.getItem('hs_access_token');

  console.log('[HS] TEST -- Connection Test Start --');

  if (!token) {
    steps.push({ label: 'Token check', status: 'fail', detail: 'No access token in localStorage', durationMs: 0 });
    return { overall: 'fail', steps };
  }

  // 1. Account info
  const t0 = performance.now();
  try {
    const res = await hsRelay('account-info/v3/details', token);
    const json = await res.json();
    const ms = Math.round(performance.now() - t0);
    if (res.ok) {
      steps.push({ label: 'Account info', status: 'pass', detail: `Portal ${json.portalId} (${ms}ms)`, durationMs: ms });
    } else {
      steps.push({ label: 'Account info', status: 'fail', detail: `${res.status}: ${json.message || res.statusText}`, durationMs: ms });
    }
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    steps.push({ label: 'Account info', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  // 2. Contacts access
  const t1 = performance.now();
  try {
    const res = await hsRelay('crm/v3/objects/contacts?limit=1', token);
    const ms = Math.round(performance.now() - t1);
    if (res.ok) {
      steps.push({ label: 'Contacts access', status: 'pass', detail: `200 (${ms}ms)`, durationMs: ms });
    } else {
      const json = await res.json().catch(() => null);
      steps.push({ label: 'Contacts access', status: 'fail', detail: `${res.status}: ${json?.message || res.statusText}`, durationMs: ms });
    }
  } catch (err) {
    const ms = Math.round(performance.now() - t1);
    steps.push({ label: 'Contacts access', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  // 3. Companies access
  const t2 = performance.now();
  try {
    const res = await hsRelay('crm/v3/objects/companies?limit=1', token);
    const ms = Math.round(performance.now() - t2);
    if (res.ok) {
      steps.push({ label: 'Companies access', status: 'pass', detail: `200 (${ms}ms)`, durationMs: ms });
    } else {
      const json = await res.json().catch(() => null);
      steps.push({ label: 'Companies access', status: 'fail', detail: `${res.status}: ${json?.message || res.statusText}`, durationMs: ms });
    }
  } catch (err) {
    const ms = Math.round(performance.now() - t2);
    steps.push({ label: 'Companies access', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[HS] TEST -- Connection Test ${overall.toUpperCase()} --`, steps);
  return { overall, steps };
}
