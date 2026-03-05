// ── Salesforce Platform OAuth 2.0 + PKCE Client ──────────────
// Completely separate from Olympus-Grid (olympus-grid-client.ts).
// Uses Authorization: Bearer — never x-user-identity.

const SF_CLIENT_ID =
  import.meta.env.VITE_SF_CLIENT_ID ||
  (() => {
    console.warn('[SF] VITE_SF_CLIENT_ID not set — using hardcoded fallback');
    return '3MVG9C7wVcFOM8jlLOXM9O1eju7DU8U13EeETr_2x_CGfYwBYFhqdRkXRtASsm9xVTWnINMc7wraL6B6pGFFs';
  })();

const SF_CALLBACK_URL =
  import.meta.env.VITE_SF_CALLBACK_URL ||
  `${window.location.origin}/oauth/callback/salesforce`;

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
  sessionStorage.setItem('sf_pkce_verifier', verifier);
  // Store the login server (e.g. test.salesforce.com) — token exchange will use this
  sessionStorage.setItem('sf_login_instance_url', instanceUrl);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SF_CLIENT_ID,
    redirect_uri: SF_CALLBACK_URL,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  console.log('[SF] Login URL generated for instance:', instanceUrl);
  return `${instanceUrl}/services/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const verifier = sessionStorage.getItem('sf_pkce_verifier');
  const instanceUrl = sessionStorage.getItem('sf_login_instance_url');

  if (!verifier || !instanceUrl) {
    throw new Error('PKCE session data missing — please retry the login flow');
  }

  console.log('[SF] Exchanging authorization code for tokens...');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: SF_CLIENT_ID,
    redirect_uri: SF_CALLBACK_URL,
    code,
    code_verifier: verifier,
  });

  const response = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = await response.json();

  if (!response.ok) {
    console.error('[SF] Token exchange failed:', json);
    throw new Error(json.error_description || json.error || 'Token exchange failed');
  }

  console.log('[SF] Token exchange successful — instance:', json.instance_url);

  // Store tokens
  localStorage.setItem('sf_access_token', json.access_token);
  localStorage.setItem('sf_instance_url', json.instance_url);
  localStorage.setItem('sf_token_type', json.token_type);
  localStorage.setItem('sf_issued_at', json.issued_at);
  if (json.refresh_token) {
    localStorage.setItem('sf_refresh_token', json.refresh_token);
  }

  // Clean up session data
  sessionStorage.removeItem('sf_pkce_verifier');
  sessionStorage.removeItem('sf_login_instance_url');
}

export async function refreshSalesforceToken(): Promise<void> {
  const refreshToken = localStorage.getItem('sf_refresh_token');
  const instanceUrl = localStorage.getItem('sf_instance_url');

  if (!refreshToken || !instanceUrl) {
    throw new Error('sf_session_expired');
  }

  console.log('[SF] Refreshing access token...');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: SF_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = await response.json();

  if (!response.ok) {
    console.error('[SF] Token refresh failed:', json);
    clearSalesforceTokens();
    throw new Error('sf_session_expired');
  }

  console.log('[SF] Token refresh successful');
  localStorage.setItem('sf_access_token', json.access_token);
  localStorage.setItem('sf_issued_at', json.issued_at);
  if (json.instance_url) {
    localStorage.setItem('sf_instance_url', json.instance_url);
  }
}

export function disconnectSalesforce(): void {
  const token = localStorage.getItem('sf_access_token');
  const instanceUrl = localStorage.getItem('sf_instance_url');

  // Best-effort server-side revoke (fire and forget)
  if (token && instanceUrl) {
    fetch(`${instanceUrl}/services/oauth2/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `token=${encodeURIComponent(token)}`,
    }).catch(() => {});
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
}

export function isSalesforceConnected(): boolean {
  return !!localStorage.getItem('sf_access_token');
}

export function getSalesforceInstanceUrl(): string | null {
  return localStorage.getItem('sf_instance_url');
}

// ── Authenticated Platform API Requests ──────────────────────

export async function sfRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const accessToken = localStorage.getItem('sf_access_token');
  const instanceUrl = localStorage.getItem('sf_instance_url');

  if (!accessToken || !instanceUrl) {
    throw new Error('Not connected to Salesforce');
  }

  const fullUrl = `${instanceUrl}${path}`;
  console.log('[SF] REQUEST:', method, fullUrl);

  let response = await fetch(fullUrl, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // Auto-refresh on 401, retry once
  if (response.status === 401) {
    console.log('[SF] 401 received — attempting token refresh...');
    try {
      await refreshSalesforceToken();
      const newToken = localStorage.getItem('sf_access_token')!;
      response = await fetch(fullUrl, {
        method,
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json',
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

  const accessToken = localStorage.getItem('sf_access_token');
  const instanceUrl = localStorage.getItem('sf_instance_url');

  if (!accessToken || !instanceUrl) {
    steps.push({ label: 'Token check', status: 'fail', detail: 'No access token in localStorage', durationMs: 0 });
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

  // 3. Refresh token flow
  const refreshToken = localStorage.getItem('sf_refresh_token');
  if (refreshToken) {
    const originalToken = localStorage.getItem('sf_access_token');
    const t2 = performance.now();
    try {
      await refreshSalesforceToken();
      const newToken = localStorage.getItem('sf_access_token');
      const ms = Math.round(performance.now() - t2);
      const changed = newToken !== originalToken;
      console.log('[SF] TEST refresh result: token changed =', changed);
      steps.push({ label: 'Token refresh', status: 'pass', detail: `New token issued (${ms}ms)${changed ? '' : ' — same token returned'}`, durationMs: ms });

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
  } else {
    steps.push({ label: 'Token refresh', status: 'skip', detail: 'No refresh token in localStorage', durationMs: 0 });
    steps.push({ label: 'Post-refresh API call', status: 'skip', detail: 'No refresh token', durationMs: 0 });
  }

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[SF] TEST -- Connection Test ${overall.toUpperCase()} --`, steps);

  return { overall, steps };
}
