import type { OlympusUser, CaseRecord } from '@/types/service';
import { useEnvironmentStore } from '@/lib/store/environment-store';

/**
 * Display URL for the Olympus-Grid master route.
 * All OG API calls go through Ares → Hermes → Salesforce.
 * The browser never contacts Salesforce directly.
 */
export function getServiceUrl(): string {
  return getGridBase();
}

/** Gateway URL — Ares auth routes are mounted directly at /api/auth/* */
function getGatewayUrl(): string {
  return useEnvironmentStore.getState().getGatewayUrl();
}

/** Base URL for Olympus-Grid calls routed through Ares gateway. */
function getGridBase(): string {
  return useEnvironmentStore.getState().getGatewayUrl() + '/v1/grid/master';
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}


/**
 * Shared authenticated request against Olympus-Grid via Ares gateway.
 * Auth is handled via httpOnly cookies — Ares cookieToHeader middleware injects
 * the x-user-identity header server-side.
 *
 * On 401: clears stored display values and throws so the UI can prompt reconnect.
 */
export async function ogRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const fullUrl = `${getGridBase()}${path}`;

  console.log('[OG] REQUEST:', method, fullUrl, body);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Include JWT from localStorage if available (x-token-delivery: header path)
  // If not in localStorage, cookies are sent via credentials: 'include' and
  // Ares cookieToHeader middleware converts them to x-user-identity
  const storedToken = localStorage.getItem('og_access_token');
  if (storedToken) {
    headers['x-user-identity'] = storedToken;
  }

  const response = await fetch(fullUrl, {
    method,
    credentials: 'include',
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const json = await response.json().catch(() => null);

  console.log('[OG] RESPONSE:', response.status, json);

  if (response.status === 401) {
    clearStoredTokens();
    throw new Error('Session expired -- please reconnect Olympus-Grid');
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
  // Public endpoint — do NOT send cookies (stale JWT causes 401)
  const url = `${getGridBase()}/auth/email/link/request`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      clientId: 'turtleshell-web',
      callbackUrl: window.location.origin + '/auth/callback',
    }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error || `Request failed (${response.status})`);
  return (json?.result ?? json) as { requestId: string; expiresIn: number };
}

export interface VerifyResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: OlympusUser;
  // Populated by Apex `ApiRouteAuth.handleEmailLinkVerify` (line 219) and
  // `handleAppleSignIn`. Drives post-login routing: true → /app/chat,
  // false → /onboarding. Previously omitted from this type, forcing
  // callers to fall back to localStorage, which broke whenever a user
  // logged out or signed in on a second device.
  accountStatus?: string;
  onboardingComplete?: boolean;
}

export async function verifyCode(
  code: string,
  requestId: string,
): Promise<VerifyResult> {
  // Use x-token-delivery: header so Ares returns tokens in response headers
  // instead of httpOnly cookies (cookies don't work through Vite proxy in dev)
  const url = `${getGridBase()}/auth/email/link/verify`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-token-delivery': 'header',
    },
    body: JSON.stringify({
      code: code.toUpperCase().trim(),
      requestId,
    }),
  });

  // Capture tokens from response headers (set by Ares with x-token-delivery: header)
  const accessToken = response.headers.get('x-og-access-token');
  const refreshToken = response.headers.get('x-og-refresh-token');

  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error || `Verification failed (${response.status})`);

  const verified = (json?.result ?? json) as VerifyResult;

  // Store tokens in localStorage — used for authenticated API requests
  if (accessToken) localStorage.setItem('og_access_token', accessToken);
  if (refreshToken) localStorage.setItem('og_refresh_token', refreshToken);

  // Detect an identity switch BEFORE we overwrite the stored sub. When the
  // user signs in as someone different (or after the operator nuked scratch
  // records and the same email re-minted a new Identity__c with a fresh
  // sub), the persisted chat threads, cosmos-logos agents, and guide
  // selection all belong to the old identity and bleed into the new
  // session ("why is my old Athena chat here?"). Wipe per-identity app
  // state so the new session starts clean.
  const previousSub = localStorage.getItem('olympus_grid_shell_id');
  const identitySwitched = verified.user.sub && previousSub && previousSub !== verified.user.sub;
  if (identitySwitched) {
    console.log('[Auth] Identity changed — clearing per-identity app state');
    // Chat threads and active agent ids
    localStorage.removeItem('turtleshell-chat');
    // Cosmos-logos connected agents + active chat agent id
    localStorage.removeItem('turtleshell-cosmos-agents');
    // Onboarding selections
    localStorage.removeItem('turtleshell-onboarding');
    localStorage.removeItem('turtleshell-guide');
    localStorage.removeItem('turtleshell_username');
    // Custom/hidden agents
    localStorage.removeItem('turtleshell-hidden-agents');
    localStorage.removeItem('turtleshell-custom-agents');
    localStorage.removeItem('turtleshell-athena-disconnected');
    localStorage.removeItem('selected_agent');
  }

  localStorage.setItem('olympus_grid_email', verified.user.email);
  localStorage.setItem('olympus_grid_service_url', getGridBase());

  if (verified.user.sub) {
    localStorage.setItem('olympus_grid_shell_id', verified.user.sub);
  }

  return verified;
}

/**
 * Sign in with Apple — exchanges Apple's identity token for a TurtleShell
 * JWT, mirrors the lifecycle of `verifyCode` so RequireAuth + downstream
 * routing treat it identically to the magic-link path.
 *
 * Endpoint: POST {gateway}/v1/auth/apple/identity/verify
 *   - Hosted on Ares (NOT under /v1/grid/master)
 *   - Ares verifies the JWT against Apple's JWKS, then forwards extracted
 *     claims to Apex /v1/grid/master/auth/apple/identity/verify with
 *     `x-service-name: ares` so Apex trusts the inbound path.
 */
export async function signInWithApple(args: {
  identityToken: string;
  user?: { email?: string; name?: { firstName?: string; lastName?: string } };
}): Promise<VerifyResult & { accountStatus?: string; onboardingComplete?: boolean }> {
  const url = `${getGatewayUrl()}/v1/auth/apple/identity/verify`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-token-delivery': 'header',
    },
    body: JSON.stringify({
      identityToken: args.identityToken,
      clientId: 'turtleshell-web',
      user: args.user,
    }),
  });

  // Same response-header token-extraction pattern used by /verify
  const accessToken = response.headers.get('x-og-access-token');
  const refreshToken = response.headers.get('x-og-refresh-token');

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(json?.error || `Apple sign-in failed (${response.status})`);
  }

  const verified = (json?.result ?? json) as VerifyResult & {
    accountStatus?: string;
    onboardingComplete?: boolean;
  };

  if (accessToken) localStorage.setItem('og_access_token', accessToken);
  else if (verified.accessToken) localStorage.setItem('og_access_token', verified.accessToken);
  if (refreshToken) localStorage.setItem('og_refresh_token', refreshToken);
  else if (verified.refreshToken) localStorage.setItem('og_refresh_token', verified.refreshToken);

  // Identity-switch detection — same logic as verifyCode
  const previousSub = localStorage.getItem('olympus_grid_shell_id');
  const identitySwitched = verified.user?.sub && previousSub && previousSub !== verified.user.sub;
  if (identitySwitched) {
    console.log('[Auth] Identity changed (Apple sign-in) — clearing per-identity app state');
    localStorage.removeItem('turtleshell-chat');
    localStorage.removeItem('turtleshell-cosmos-agents');
    localStorage.removeItem('turtleshell-onboarding');
    localStorage.removeItem('turtleshell-guide');
    localStorage.removeItem('turtleshell_username');
    localStorage.removeItem('turtleshell-hidden-agents');
    localStorage.removeItem('turtleshell-custom-agents');
    localStorage.removeItem('turtleshell-athena-disconnected');
    localStorage.removeItem('selected_agent');
  }

  if (verified.user?.email) localStorage.setItem('olympus_grid_email', verified.user.email);
  localStorage.setItem('olympus_grid_service_url', getGridBase());
  if (verified.user?.sub) localStorage.setItem('olympus_grid_shell_id', verified.user.sub);

  return verified;
}

export function clearStoredTokens() {
  localStorage.removeItem('olympus_grid_email');
  localStorage.removeItem('olympus_grid_service_url');
  localStorage.removeItem('olympus_grid_shell_id');
  localStorage.removeItem('og_access_token');
  localStorage.removeItem('og_refresh_token');
}

/** @deprecated Token is no longer stored in localStorage — use checkAuthStatus() instead */
export function getStoredAccessToken(): string | null {
  return null;
}

export async function refreshOlympusGridToken(): Promise<void> {
  console.log('[OG] Refreshing access token via httpOnly cookie...');

  const url = `${getGridBase()}/auth/token/session/refresh`;
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || json?.error) {
    console.error('[OG] Token refresh failed:', json);
    const raw = json?.error || json?.message || `Refresh failed (${response.status})`;
    throw new Error(stripHtml(typeof raw === 'string' ? raw : JSON.stringify(raw)));
  }

  // New tokens are set as httpOnly cookies by Ares — nothing to store locally
  console.log('[OG] Token refresh successful');
}

// ── Auth Status ──────────────────────────────────────────

/**
 * Check if the user is authenticated by calling the OG identity endpoint
 * through the full stack: Ares (cookie→header) → Hermes → Olympus-Grid.
 * Returns true if the httpOnly cookie chain resolves to a valid session.
 */
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${getGridBase()}/identity/me`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Call the server-side logout endpoint to clear httpOnly cookies.
 * Fire-and-forget — best effort.
 */
export async function serverLogout(): Promise<void> {
  try {
    await fetch(getGatewayUrl() + '/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Best effort
  }
}

// ── Service Desk ──────────────────────────────────────────

export async function listCases(): Promise<CaseRecord[]> {
  const result = await ogRequest('GET', '/servicedesk/sfcase');
  return result as CaseRecord[];
}

export async function createCase(
  subject: string,
  description: string,
): Promise<{ id: string; caseNumber: string }> {
  const result = await ogRequest('POST', '/servicedesk/sfcase', { subject, description });
  const records = result as CaseRecord[];
  const created = records[0];
  if (!created) throw new Error('No case returned from server');
  return { id: created.Id, caseNumber: created.CaseNumber };
}

/**
 * Sync check for whether the user has logged in.
 * Uses olympus_grid_email as a proxy — the actual auth validation
 * happens server-side via httpOnly cookies.
 */
export function isOlympusGridTokenPresent(): boolean {
  return !!localStorage.getItem('olympus_grid_email');
}

/**
 * Get the authenticated user's shell ID (JWT sub).
 * Falls back to 'shell-default' if not authenticated.
 */
export function getShellId(): string {
  return localStorage.getItem('olympus_grid_shell_id') || 'shell-default';
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
    const res = await fetch(url, { signal: controller.signal, credentials: 'include', ...init });
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
  const gridBase = getGridBase();
  const hasEmail = !!localStorage.getItem('olympus_grid_email');

  console.log('[OG] TEST -- Connection Test Start --');
  console.log('[OG] TEST gridBase:', gridBase);
  console.log('[OG] TEST hasEmail:', hasEmail);

  // 1. Check auth status via Ares
  const t0 = performance.now();
  const isAuth = await checkAuthStatus();
  const ms0 = Math.round(performance.now() - t0);

  if (isAuth) {
    steps.push({ label: 'Auth status (cookie)', status: 'pass', detail: `Authenticated (${ms0}ms)`, durationMs: ms0 });

    // 2. Identity probe via Ares → Hermes → OG (POST — OG only has handlePost)
    steps.push(await probeUrl(
      'OG identity (via Ares)',
      `${gridBase}/identity/me`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ));

    // 3. Authenticated service desk call via Ares → Hermes → OG
    steps.push(await probeUrl(
      'Service Desk (list cases)',
      `${gridBase}/servicedesk/sfcase`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    ));

    // 4. Refresh token flow
    const t2 = performance.now();
    try {
      await refreshOlympusGridToken();
      const ms = Math.round(performance.now() - t2);
      steps.push({ label: 'Token refresh', status: 'pass', detail: `Refresh successful (${ms}ms)`, durationMs: ms });
    } catch (err) {
      const ms = Math.round(performance.now() - t2);
      steps.push({ label: 'Token refresh', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
    }
  } else {
    steps.push({ label: 'Auth status (cookie)', status: 'fail', detail: `Not authenticated (${ms0}ms)`, durationMs: ms0 });
    steps.push({ label: 'OG identity (via Ares)', status: 'skip', detail: 'Not authenticated', durationMs: 0 });
    steps.push({ label: 'Service Desk (list cases)', status: 'skip', detail: 'Not authenticated', durationMs: 0 });
    steps.push({ label: 'Token refresh', status: 'skip', detail: 'Not authenticated', durationMs: 0 });
  }

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[OG] TEST -- Connection Test ${overall.toUpperCase()} --`, steps);

  return { overall, steps };
}
