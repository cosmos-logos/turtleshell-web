// ── Salesforce Platform OAuth 2.0 + PKCE Client ──────────────
// Auth tokens are httpOnly cookies managed by Ares.
// Token exchange: TSW → Ares → Hermes → salesforce.com
// API calls: TSW → Ares → Hermes → salesforce.com (cookie → header injection)

import { useEnvironmentStore } from '@/lib/store/environment-store';

const SF_CLIENT_ID_DEFAULT =
  import.meta.env.VITE_SF_CLIENT_ID ||
  '3MVG9nSH73I5aFNiVgku4fbvk1TBGkXFlEAB7fE7tLMNYPvE5CGkOv5HQGsRCWSwbhpgZYvy5z1xV_GjoeuGd';

/** Read SF client ID — developer override from localStorage takes priority */
function getSfClientId(): string {
  return localStorage.getItem('sf_client_id_override') || SF_CLIENT_ID_DEFAULT;
}

const SF_CALLBACK_URL =
  import.meta.env.VITE_SF_CALLBACK_URL ||
  `${window.location.origin}/oauth/callback/salesforce`;

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

export async function getSalesforceLoginUrl(instanceUrl: string): Promise<string> {
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);

  // Store temporarily for the callback
  localStorage.setItem('sf_pkce_verifier', verifier);
  localStorage.setItem('sf_login_instance_url', instanceUrl);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getSfClientId(),
    redirect_uri: SF_CALLBACK_URL,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  console.log('[SF] Login URL generated for instance:', instanceUrl);
  return `${instanceUrl}/services/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens via Ares → Hermes → Salesforce.
 * Ares intercepts the response and sets __Host-sf_access / __Host-sf_refresh cookies.
 */
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const verifier = localStorage.getItem('sf_pkce_verifier');
  const loginUrl = localStorage.getItem('sf_login_instance_url');

  if (!verifier || !loginUrl) {
    throw new Error('PKCE session data missing — please retry the login flow');
  }

  console.log('[SF] Exchanging authorization code for tokens via proxy...');

  // Route through Vite proxy → Ares → Hermes → Salesforce.
  // x-token-delivery: header tells Ares to return tokens in the response body
  // instead of stripping them into httpOnly cookies.
  const response = await fetch(`${getGatewayUrl()}/v1/salesforce/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-token-delivery': 'header',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: getSfClientId(),
      redirect_uri: SF_CALLBACK_URL,
      code,
      code_verifier: verifier,
      login_url: loginUrl,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    console.error('[SF] Token exchange failed:', json);
    throw new Error(json.error_description || json.error || 'Token exchange failed');
  }

  console.log('[SF] Token exchange successful — instance:', json.instance_url);

  // Tokens come from response headers (Ares strips them from body for security).
  // x-token-delivery: header tells Ares to include them in response headers.
  const accessToken = response.headers.get('x-sf-access-token') || json.access_token;
  const refreshToken = response.headers.get('x-sf-refresh-token') || json.refresh_token;

  // Store tokens in localStorage — sent as headers on chat requests,
  // encrypted to Poseidon's public key via cosmos-logos envelope.
  if (accessToken) localStorage.setItem('sf_access_token', accessToken);
  if (refreshToken) localStorage.setItem('sf_refresh_token', refreshToken);
  if (json.instance_url) localStorage.setItem('sf_instance_url', json.instance_url);
  if (json.token_type) localStorage.setItem('sf_token_type', json.token_type);
  if (json.issued_at) localStorage.setItem('sf_issued_at', json.issued_at);

  // Clean up session data
  localStorage.removeItem('sf_pkce_verifier');
  localStorage.removeItem('sf_login_instance_url');
}

/**
 * Refresh the SF access token via Ares → Hermes → Salesforce.
 * Ares reads __Host-sf_refresh cookie and forwards to Hermes.
 */
export async function refreshSalesforceToken(): Promise<void> {
  const instanceUrl = localStorage.getItem('sf_instance_url');
  const refreshToken = localStorage.getItem('sf_refresh_token');

  if (!instanceUrl || !refreshToken) {
    throw new Error('sf_session_expired');
  }

  console.log('[SF] Refreshing access token via proxy...');

  const response = await fetch(`${getGatewayUrl()}/v1/salesforce/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-token-delivery': 'header',
      'x-sf-refresh-token': refreshToken,
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: getSfClientId(),
      login_url: instanceUrl,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    console.error('[SF] Token refresh failed:', json);
    clearSalesforceTokens();
    throw new Error('sf_session_expired');
  }

  console.log('[SF] Token refresh successful');
  const newAccessToken = response.headers.get('x-sf-access-token') || json.access_token;
  if (newAccessToken) localStorage.setItem('sf_access_token', newAccessToken);
  if (json.issued_at) localStorage.setItem('sf_issued_at', json.issued_at);
  if (json.instance_url) localStorage.setItem('sf_instance_url', json.instance_url);
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
  localStorage.removeItem('sf_access_token');
  localStorage.removeItem('sf_refresh_token');
  localStorage.removeItem('sf_instance_url');
  localStorage.removeItem('sf_token_type');
  localStorage.removeItem('sf_issued_at');
  localStorage.removeItem('sf_pkce_verifier');
  localStorage.removeItem('sf_login_instance_url');
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
 * The SF access token flows as: __Host-sf_access cookie → x-salesforce-token header (Ares)
 * → Authorization: Bearer (Hermes SF proxy).
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

  // Route through Ares → Hermes SF API proxy
  const proxyUrl = `${getGatewayUrl()}/v1/salesforce/api${path}`;
  console.log('[SF] REQUEST:', method, proxyUrl);

  let response = await fetch(proxyUrl, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-salesforce-instance-url': instanceUrl,
    },
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
        headers: {
          'Content-Type': 'application/json',
          'x-salesforce-instance-url': instanceUrl,
        },
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

  // 3. Token refresh flow
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

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[SF] TEST -- Connection Test ${overall.toUpperCase()} --`, steps);

  return { overall, steps };
}
