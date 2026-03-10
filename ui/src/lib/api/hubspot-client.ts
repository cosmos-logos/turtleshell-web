// ── HubSpot Private App Token Client ─────────────────────────
// Auth tokens are httpOnly cookies managed by Ares.
// Token validation: TSW → Ares → Hermes → api.hubapi.com
// API calls: TSW → Ares → Hermes → api.hubapi.com (cookie → header injection)

import { useEnvironmentStore } from '@/lib/store/environment-store';

function getGatewayUrl(): string {
  return useEnvironmentStore.getState().getGatewayUrl();
}

// ── Types ────────────────────────────────────────────────────

export interface HubSpotAccount {
  portalId: string;
  companyName: string;
  domain: string;
}

// ── Gateway-relayed fetch helper ─────────────────────────────

async function hsRelay(path: string): Promise<Response> {
  // Token flows as: __Host-hs_access cookie → x-hubspot-api-key header (Ares)
  // → Authorization: Bearer (Hermes HubSpot relay)
  return fetch(`${getGatewayUrl()}/v1/hubspot/${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Token Validation ─────────────────────────────────────────

/**
 * Validate HubSpot Private App token via Ares → Hermes → HubSpot.
 * Ares validates, sets __Host-hs_access cookie, returns account info.
 */
export async function validateAndStoreToken(apiKey: string): Promise<HubSpotAccount> {
  console.log('[HS] Validating Private App token via Ares...');

  const res = await fetch(`${getGatewayUrl()}/v1/hubspot/auth/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token: apiKey }),
  });

  const json = await res.json();

  if (!res.ok) {
    const msg = json?.message || `HubSpot returned ${res.status}`;
    console.error('[HS] Token validation failed:', msg);
    throw new Error(msg);
  }

  const account = json.account;
  localStorage.setItem('hs_portal_id', String(account.portalId));
  localStorage.setItem('hs_company_name', account.companyDomain ?? account.accountType ?? '');
  localStorage.setItem('hs_domain', account.uiDomain ?? '');

  console.log('[HS] Token validated — portal:', account.portalId);
  return {
    portalId: String(account.portalId),
    companyName: account.companyDomain ?? account.accountType ?? '',
    domain: account.uiDomain ?? '',
  };
}

// ── Disconnect ───────────────────────────────────────────────

export function disconnectHubSpot(): void {
  fetch(`${getGatewayUrl()}/v1/hubspot/auth/revoke`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {}); // fire and forget
  localStorage.removeItem('hs_portal_id');
  localStorage.removeItem('hs_company_name');
  localStorage.removeItem('hs_domain');
  console.log('[HS] Disconnected');
}

// ── Status ───────────────────────────────────────────────────

export function isHubSpotConnected(): boolean {
  return !!localStorage.getItem('hs_portal_id');
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
  const portalId = localStorage.getItem('hs_portal_id');
  if (!portalId) return;

  console.log('[HS] Validating stored session via cookie...');
  try {
    const res = await hsRelay('account-info/v3/details');

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
  const portalId = localStorage.getItem('hs_portal_id');

  console.log('[HS] TEST -- Connection Test Start --');

  if (!portalId) {
    steps.push({ label: 'Connection check', status: 'fail', detail: 'No HubSpot portal — not connected', durationMs: 0 });
    return { overall: 'fail', steps };
  }

  // 1. Account info — token sent via httpOnly cookie through Ares → Hermes relay
  const t0 = performance.now();
  try {
    const res = await hsRelay('account-info/v3/details');
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
    const res = await hsRelay('crm/v3/objects/contacts?limit=1');
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
    const res = await hsRelay('crm/v3/objects/companies?limit=1');
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
