// ── Salesforce Platform OAuth 2.0 + PKCE Client (LEGACY / DEPRECATED) ──
//
// This module used to run the Services-page Salesforce OAuth flow and
// store access/refresh tokens as plaintext in localStorage. That path
// has been retired because it violates the sovereignty invariant:
//
//   SF credentials MUST NOT be available in the browser unless they
//   are encrypted to the Poseidon tool-server's public key.
//
// The correct entry point is the per-agent Tools flow
// (ui/src/lib/tools/salesforce-tool-oauth.ts), which seals tokens on
// the device before persistence. This module exists only for:
//   1. Stub exports so still-extant imports compile (no behaviour)
//   2. The `scrubLegacySfCredentials` guard that wipes any plaintext
//      sf_* keys it finds in localStorage — defense in depth in case
//      a compromised build or third-party script writes them.
//
// Do NOT re-add plaintext token storage here. If you need a new
// Salesforce-credential code path, seal first, persist ciphertext only,
// and route API calls through Poseidon (never direct from the browser).

import { useEnvironmentStore } from '@/lib/store/environment-store';

/**
 * Keys the legacy flow used to write. Centralized so the scrubber,
 * logout wipe, and any future audit code all reference the same list.
 *
 * `sf_client_id_override` is here even though the Consumer Key is a
 * public identifier (not a secret). Rationale: the tool-flow wizard
 * no longer stores it in localStorage, so any instance found here is
 * stale from an older build. Wiping is "leave localStorage empty
 * post-ceremony" hygiene, not a credential-protection step.
 */
export const LEGACY_SF_PLAINTEXT_KEYS = [
  'sf_access_token',
  'sf_refresh_token',
  'sf_instance_url',
  'sf_token_type',
  'sf_issued_at',
  'sf_client_id_override',
] as const;

/**
 * Defensively wipe any plaintext SF credential keys from localStorage.
 * Called on module import (see bottom), on any legacy entry point,
 * and by logout. If anything is wiped, log a warning — that's a
 * regression signal that something wrote plaintext behind our back.
 */
export function scrubLegacySfCredentials(): void {
  let found = 0;
  for (const k of LEGACY_SF_PLAINTEXT_KEYS) {
    try {
      if (localStorage.getItem(k) !== null) {
        localStorage.removeItem(k);
        found++;
      }
    } catch {
      // non-fatal — localStorage may be blocked
    }
  }
  if (found > 0) {
    // Loud by design: plaintext SF tokens in localStorage violates
    // the sovereignty invariant. If this fires in production, audit
    // who wrote it and close that hole.
    // eslint-disable-next-line no-console
    console.warn(
      `[SF sovereignty guard] scrubbed ${found} legacy plaintext SF key(s) from localStorage. ` +
      `Investigate any path that could write these; the invariant is ciphertext-only.`,
    );
  }
}

// Run once on module load. Any legacy plaintext left over from an
// earlier build, a previous session, or a regressed code path gets
// wiped before anything downstream can read it.
scrubLegacySfCredentials();

function getGatewayUrl(): string {
  return useEnvironmentStore.getState().getGatewayUrl();
}

// ── PKCE Helpers (Web Crypto) ──────────────────────────────────

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

async function generateChallenge(verifier: string): Promise<string> {
  const hash = await sha256(verifier);
  return base64UrlEncode(hash);
}

// ── Auth: OAuth 2.0 + PKCE ──────────────────────────────────
// Helpers kept only to satisfy still-imported signatures. The legacy
// Services flow has been retired end-to-end — both the initiator and
// the code-exchange throw now, so no localStorage keys ever get
// written in service of this module. All SF connections must go
// through the per-agent Tools flow.
export async function getSalesforceLoginUrl(_instanceUrl: string): Promise<string> {
  scrubLegacySfCredentials();
  throw new Error(
    'The Services Salesforce flow has been retired. Use Tools → Add a tool → Salesforce.',
  );
}
// Silence unused-export warnings for PKCE helpers retained in case
// a future flow wants to revive direct-to-SF token exchange.
void generateVerifier;
void generateChallenge;

/**
 * DEPRECATED — legacy Services-flow entry point.
 *
 * This function used to exchange the PKCE code for SF tokens and stash
 * them in localStorage as plaintext. That violates the sovereignty
 * invariant: "SF credentials are not available in the browser unless
 * they are encrypted to Poseidon." Calling it now throws so no code
 * path in the app can re-introduce plaintext SF credentials.
 *
 * The correct entry point is the per-agent Tools flow
 * (ui/src/lib/tools/salesforce-tool-oauth.ts), which seals tokens to
 * the Poseidon tool-server public key on the device before any
 * persistence happens.
 *
 * Also wipes any legacy keys it finds, so visiting this function via
 * an old bookmark hard-resets the user's plaintext state.
 */
export async function exchangeCodeForTokens(_code: string): Promise<void> {
  scrubLegacySfCredentials();
  throw new Error(
    'The legacy Services Salesforce flow has been retired. Connect Salesforce through Tools → Add a tool → Salesforce, which seals your credentials on your device before any persistence. The app never stores plaintext SF tokens.',
  );
}

/**
 * DEPRECATED — see exchangeCodeForTokens() above for the rationale.
 * Server-side refresh now runs inside Poseidon, driven by the sealed
 * envelope's refresh_token; no client-side refresh path exists.
 */
export async function refreshSalesforceToken(): Promise<void> {
  scrubLegacySfCredentials();
  throw new Error('sf_session_expired');
}

/**
 * Disconnect — revoke token via Ares → Hermes → Salesforce, clear cookies.
 */
export function disconnectSalesforce(): void {
  const instanceUrl = localStorage.getItem('sf_instance_url');
  if (instanceUrl) {
    fetch(`${getGatewayUrl()}/v1/salesforce/auth/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ login_url: instanceUrl }),
    }).catch(() => {}); // fire and forget
  }
  clearSalesforceTokens();
  console.log('[SF] Disconnected');
}

function clearSalesforceTokens(): void {
  // Credential keys go through the central scrubber so the list stays
  // authoritative. Session-scoped PKCE state is cleared separately.
  scrubLegacySfCredentials();
  try {
    localStorage.removeItem('sf_pkce_verifier');
    localStorage.removeItem('sf_login_instance_url');
  } catch {
    // non-fatal
  }
}

export function isSalesforceConnected(): boolean {
  return !!localStorage.getItem('sf_instance_url');
}

export function getSalesforceInstanceUrl(): string | null {
  return localStorage.getItem('sf_instance_url');
}

// ── Authenticated Platform API Requests ──────────────────────

/**
 * Make authenticated SF API calls via Ares → Hermes → Salesforce.
 * The SF access token is sent in the x-salesforce-token header from localStorage.
 * Ares cookie→header middleware will fall back to __Host-sf_access cookie if the
 * header is missing, but we always send the header so we don't depend on
 * cross-origin third-party cookies (which Chrome is phasing out).
 */
export async function sfRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const instanceUrl = localStorage.getItem('sf_instance_url');

  if (!instanceUrl) {
    throw new Error('Not connected to Salesforce');
  }

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-salesforce-instance-url': instanceUrl!,
    };
    const token = localStorage.getItem('sf_access_token');
    if (token) headers['x-salesforce-token'] = token;
    return headers;
  }

  // Route through Ares → Hermes SF API proxy
  const proxyUrl = `${getGatewayUrl()}/v1/salesforce/api${path}`;
  console.log('[SF] REQUEST:', method, proxyUrl);

  let response = await fetch(proxyUrl, {
    method,
    credentials: 'include',
    headers: buildHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // Auto-refresh on 401, retry once
  if (response.status === 401) {
    console.log('[SF] 401 received — attempting token refresh...');
    try {
      await refreshSalesforceToken();
      response = await fetch(proxyUrl, {
        method,
        credentials: 'include',
        headers: buildHeaders(),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new Error('sf_session_expired');
    }
  }

  const json = await response.json().catch(() => null);
  console.log('[SF] RESPONSE:', response.status, json);

  if (!response.ok) {
    const errorMessages = Array.isArray(json)
      ? json.map((e: { message?: string }) => e.message).join('; ')
      : json?.message || json?.error || `Request failed (${response.status})`;
    throw new Error(errorMessages);
  }

  return json;
}

// ── Connection Test ──────────────────────────────────────────

export interface SfTestStep {
  label: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
  durationMs: number;
}

export interface SfTestConnectionResult {
  overall: 'pass' | 'fail';
  steps: SfTestStep[];
}

export async function testSalesforceConnection(): Promise<SfTestConnectionResult> {
  const steps: SfTestStep[] = [];

  console.log('[SF] TEST -- Connection Test Start --');

  const instanceUrl = localStorage.getItem('sf_instance_url');

  if (!instanceUrl) {
    steps.push({ label: 'Connection check', status: 'fail', detail: 'No instance URL — not connected', durationMs: 0 });
    return { overall: 'fail', steps };
  }

  // 1. API version endpoint
  const t0 = performance.now();
  try {
    const result = await sfRequest('GET', '/services/data/v63.0/');
    const ms = Math.round(performance.now() - t0);
    steps.push({ label: 'API version endpoint', status: 'pass', detail: `200 (${ms}ms)`, durationMs: ms });
    console.log('[SF] TEST version response:', result);
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    steps.push({ label: 'API version endpoint', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  // 2. SObjects list
  const t1 = performance.now();
  try {
    await sfRequest('GET', '/services/data/v63.0/sobjects/');
    const ms = Math.round(performance.now() - t1);
    steps.push({ label: 'SObjects catalog', status: 'pass', detail: `200 (${ms}ms)`, durationMs: ms });
  } catch (err) {
    const ms = Math.round(performance.now() - t1);
    steps.push({ label: 'SObjects catalog', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  // 3. Token refresh flow — only run if a refresh token was issued.
  // Connected Apps without the offline_access scope won't return one, which is fine.
  if (!localStorage.getItem('sf_refresh_token')) {
    steps.push({ label: 'Token refresh', status: 'skip', detail: 'No refresh token (offline_access scope not granted)', durationMs: 0 });
    steps.push({ label: 'Post-refresh API call', status: 'skip', detail: 'No refresh token to test', durationMs: 0 });
  } else {
    const t2 = performance.now();
    try {
      await refreshSalesforceToken();
      const ms = Math.round(performance.now() - t2);
      steps.push({ label: 'Token refresh', status: 'pass', detail: `Refresh successful (${ms}ms)`, durationMs: ms });

      // 4. Verify refreshed token works
      const t3 = performance.now();
      try {
        await sfRequest('GET', '/services/data/v63.0/');
        const ms3 = Math.round(performance.now() - t3);
        steps.push({ label: 'Post-refresh API call', status: 'pass', detail: `200 (${ms3}ms)`, durationMs: ms3 });
      } catch (err) {
        const ms3 = Math.round(performance.now() - t3);
        steps.push({ label: 'Post-refresh API call', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms3 });
      }
    } catch (err) {
      const ms = Math.round(performance.now() - t2);
      steps.push({ label: 'Token refresh', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
      steps.push({ label: 'Post-refresh API call', status: 'skip', detail: 'Refresh failed', durationMs: 0 });
    }
  }

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[SF] TEST -- Connection Test ${overall.toUpperCase()} --`, steps);

  return { overall, steps };
}
