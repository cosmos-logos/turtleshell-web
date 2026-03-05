import type { OlympusUser, CaseRecord } from '@/types/service';

const DEVELOPER_KEY = 'ts-web-int-2026';

// Salesforce Experience Cloud site — auth endpoints live here, not on the Athena gateway
const DEFAULT_SERVICE_URL = 'https://power-ability-5403.scratch.my.site.com/portal';

export function getServiceUrl(): string {
  return localStorage.getItem('olympus_grid_service_url_override') || DEFAULT_SERVICE_URL;
}

export function setServiceUrlOverride(url: string) {
  if (url) {
    localStorage.setItem('olympus_grid_service_url_override', url);
  } else {
    localStorage.removeItem('olympus_grid_service_url_override');
  }
}

export function getServiceUrlOverride(): string {
  return localStorage.getItem('olympus_grid_service_url_override') || '';
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Fetch against the Salesforce Experience Cloud site (for auth + platform APIs).
 */
async function siteFetch(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const url = `${getServiceUrl()}/services/apexrest${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-developer-key': DEVELOPER_KEY,
      ...options.headers,
    },
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || json?.error) {
    const raw = json?.error || json?.message || `Request failed (${response.status})`;
    throw new Error(stripHtml(typeof raw === 'string' ? raw : JSON.stringify(raw)));
  }

  return json?.result ?? json;
}

/**
 * Shared authenticated request against the Olympus-Grid SF Experience Cloud site.
 * Passes the JWT via x-user-identity header (not Authorization Bearer).
 *
 * Reads olympus_grid_access_token from localStorage.
 * On 401: clears stored tokens and throws so the UI can prompt reconnect.
 */
export async function ogRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const accessToken = localStorage.getItem('olympus_grid_access_token');

  if (!accessToken) {
    throw new Error('Not connected to Olympus-Grid');
  }

  const fullUrl = `${getServiceUrl()}/services/apexrest${path}`;

  console.log('[OG] REQUEST:', method, fullUrl, body);

  const response = await fetch(fullUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-developer-key': DEVELOPER_KEY,
      'x-user-identity': accessToken,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const json = await response.json().catch(() => null);

  console.log('[OG] RESPONSE:', response.status, json);

  if (response.status === 401) {
    clearStoredTokens();
    throw new Error('Session expired — please reconnect Olympus-Grid');
  }

  if (!response.ok || json?.error) {
    const raw = json?.error || json?.message || `Request failed (${response.status})`;
    throw new Error(stripHtml(typeof raw === 'string' ? raw : JSON.stringify(raw)));
  }

  return json?.result ?? json;
}

// ── Auth: Magic Link ──────────────────────────────────────

export async function requestMagicLink(
  email: string,
): Promise<{ requestId: string; expiresIn: number }> {
  const result = await siteFetch('/v1/auth/email/link/request', {
    method: 'POST',
    body: JSON.stringify({
      email,
      clientId: 'turtleshell-web',
      callbackUrl: window.location.origin + '/auth/callback',
    }),
  });
  return result as { requestId: string; expiresIn: number };
}

export interface VerifyResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: OlympusUser;
}

export async function verifyCode(
  code: string,
  requestId: string,
): Promise<VerifyResult> {
  const result = await siteFetch('/v1/auth/email/link/verify', {
    method: 'POST',
    body: JSON.stringify({
      code: code.toUpperCase().trim(),
      requestId,
    }),
  });

  const verified = result as VerifyResult;

  // Persist tokens
  localStorage.setItem('olympus_grid_access_token', verified.accessToken);
  localStorage.setItem('olympus_grid_refresh_token', verified.refreshToken);
  localStorage.setItem('olympus_grid_service_url', getServiceUrl());
  localStorage.setItem('olympus_grid_email', verified.user.email);

  return verified;
}

export function clearStoredTokens() {
  localStorage.removeItem('olympus_grid_access_token');
  localStorage.removeItem('olympus_grid_refresh_token');
  localStorage.removeItem('olympus_grid_service_url');
  localStorage.removeItem('olympus_grid_email');
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem('olympus_grid_access_token');
}

export async function refreshOlympusGridToken(): Promise<string> {
  const refreshToken = localStorage.getItem('olympus_grid_refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  console.log('[OG] Refreshing access token...');

  const url = `${getServiceUrl()}/services/apexrest/v1/auth/token/session/refresh`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-developer-key': DEVELOPER_KEY,
    },
    body: JSON.stringify({ refreshToken }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || json?.error) {
    console.error('[OG] Token refresh failed:', json);
    const raw = json?.error || json?.message || `Refresh failed (${response.status})`;
    throw new Error(stripHtml(typeof raw === 'string' ? raw : JSON.stringify(raw)));
  }

  const result = json?.result ?? json;
  const newAccessToken = result.accessToken;
  if (!newAccessToken) {
    throw new Error('No access token in refresh response');
  }

  localStorage.setItem('olympus_grid_access_token', newAccessToken);
  console.log('[OG] Token refresh successful');
  return newAccessToken;
}

// ── Service Desk ──────────────────────────────────────────

export async function listCases(): Promise<CaseRecord[]> {
  const result = await ogRequest('GET', '/v1/servicedesk/sfcase');
  return result as CaseRecord[];
}

export async function createCase(
  subject: string,
  description: string,
): Promise<{ id: string; caseNumber: string }> {
  const result = await ogRequest('POST', '/v1/servicedesk/sfcase', { subject, description });
  const records = result as CaseRecord[];
  const created = records[0];
  if (!created) throw new Error('No case returned from server');
  return { id: created.Id, caseNumber: created.CaseNumber };
}

export function isOlympusGridTokenPresent(): boolean {
  return !!localStorage.getItem('olympus_grid_access_token');
}

// ── Connection Test ──────────────────────────────────────

export interface TestStep {
  label: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
  durationMs: number;
}

export interface TestConnectionResult {
  overall: 'pass' | 'fail';
  steps: TestStep[];
}

async function probeUrl(
  label: string,
  url: string,
  init?: RequestInit,
  acceptNon2xx = false,
): Promise<TestStep> {
  const t0 = performance.now();
  console.log(`[OG] TEST probe start: ${label} → ${url}`);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal, ...init });
    clearTimeout(timer);
    const body = await res.text().catch(() => '');
    const ms = Math.round(performance.now() - t0);
    console.log(`[OG] TEST probe done: ${label} ${res.status} (${ms}ms)`, body.slice(0, 500));
    if (res.ok || acceptNon2xx) {
      return { label, status: 'pass', detail: `${res.status} (${ms}ms)${acceptNon2xx && !res.ok ? ' — reachable' : ''}`, durationMs: ms };
    }
    return { label, status: 'fail', detail: `${res.status} ${res.statusText} — ${body.slice(0, 200)}`, durationMs: ms };
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[OG] TEST probe error: ${label} (${ms}ms)`, msg);
    return { label, status: 'fail', detail: msg, durationMs: ms };
  }
}

export async function testConnection(): Promise<TestConnectionResult> {
  const steps: TestStep[] = [];
  const serviceUrl = getServiceUrl();
  const apexBase = `${serviceUrl}/services/apexrest`;
  const accessToken = localStorage.getItem('olympus_grid_access_token');

  console.log('[OG] TEST ── Connection Test Start ──');
  console.log('[OG] TEST serviceUrl:', serviceUrl);
  console.log('[OG] TEST apexBase:', apexBase);
  console.log('[OG] TEST accessToken:', accessToken ? `${accessToken.slice(0, 12)}...` : '(none)');
  console.log('[OG] TEST developerKey:', DEVELOPER_KEY);

  // 1. Probe SF site reachability + auth token via POST /v1/identity/me
  if (accessToken) {
    steps.push(await probeUrl(
      'SF Site reachable + identity',
      `${apexBase}/v1/identity/me`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-developer-key': DEVELOPER_KEY,
          'x-user-identity': accessToken,
        },
      },
    ));

    // 3. Authenticated service desk call
    steps.push(await probeUrl(
      'Service Desk (list cases)',
      `${apexBase}/v1/servicedesk/sfcase`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-developer-key': DEVELOPER_KEY,
          'x-user-identity': accessToken,
        },
      },
    ));
    // 3. Refresh token flow
    const refreshToken = localStorage.getItem('olympus_grid_refresh_token');
    if (refreshToken) {
      const originalToken = localStorage.getItem('olympus_grid_access_token');
      const t2 = performance.now();
      try {
        const newToken = await refreshOlympusGridToken();
        const ms = Math.round(performance.now() - t2);
        const changed = newToken !== originalToken;
        console.log('[OG] TEST refresh result: token changed =', changed);
        steps.push({ label: 'Token refresh', status: 'pass', detail: `New token issued (${ms}ms)${changed ? '' : ' — same token returned'}`, durationMs: ms });
      } catch (err) {
        const ms = Math.round(performance.now() - t2);
        steps.push({ label: 'Token refresh', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
      }
    } else {
      steps.push({ label: 'Token refresh', status: 'skip', detail: 'No refresh token in localStorage', durationMs: 0 });
    }
  } else {
    steps.push({ label: 'SF Site reachable + identity', status: 'skip', detail: 'No access token in localStorage', durationMs: 0 });
    steps.push({ label: 'Service Desk (list cases)', status: 'skip', detail: 'No access token in localStorage', durationMs: 0 });
    steps.push({ label: 'Token refresh', status: 'skip', detail: 'No access token in localStorage', durationMs: 0 });
  }

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[OG] TEST ── Connection Test ${overall.toUpperCase()} ──`, steps);

  return { overall, steps };
}
