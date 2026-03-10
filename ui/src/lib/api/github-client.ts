// ── GitHub OAuth Device Flow + PAT Client ─────────────────────
// Auth tokens are httpOnly cookies managed by Ares.
// Token exchange: TSW → Ares → Hermes → github.com
// API calls: TSW → Ares → Hermes → api.github.com (cookie → header injection)
// Device Flow requires no client_secret (public OAuth App).

import { useEnvironmentStore } from '@/lib/store/environment-store';

const GH_CLIENT_ID = import.meta.env.VITE_GH_CLIENT_ID || (() => {
  console.warn('[GH] VITE_GH_CLIENT_ID not set — GitHub Device Flow will fail');
  return '';
})();

function getGatewayUrl(): string {
  return useEnvironmentStore.getState().getGatewayUrl();
}

// ── Types ────────────────────────────────────────────────────

export interface GitHubUser {
  login: string;
  name: string;
  avatarUrl: string;
}

export interface DeviceFlowStart {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

// ── Device Flow ──────────────────────────────────────────────

export async function startDeviceFlow(): Promise<DeviceFlowStart> {
  console.log('[GH] Starting device flow via Ares...');

  const res = await fetch(`${getGatewayUrl()}/v1/github/auth/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      client_id: GH_CLIENT_ID,
      scope: 'repo read:user read:org',
    }),
  });

  const json = await res.json();

  if (!res.ok || json.error) {
    console.error('[GH] Device flow start failed:', json);
    throw new Error(json.error_description || json.error || 'Failed to start device flow');
  }

  console.log('[GH] Device code issued — user_code:', json.user_code);

  return {
    deviceCode: json.device_code,
    userCode: json.user_code,
    verificationUri: json.verification_uri,
    expiresIn: json.expires_in,
    interval: json.interval,
  };
}

/**
 * Poll for token via Ares → Hermes → GitHub.
 * Ares intercepts access_token and sets __Host-gh_access cookie.
 * Ares also fetches user info and includes it in the response.
 */
export async function pollForToken(
  deviceCode: string,
  expiresIn: number,
  initialInterval: number,
  signal?: AbortSignal,
): Promise<GitHubUser> {
  let interval = Math.max(initialInterval, 5) * 1000; // ms, min 5s
  const deadline = Date.now() + expiresIn * 1000;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('gh_device_cancelled');

    await sleep(interval);

    if (signal?.aborted) throw new Error('gh_device_cancelled');

    const res = await fetch(`${getGatewayUrl()}/v1/github/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        client_id: GH_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const json = await res.json();

    // Token was intercepted by Ares (set as cookie, stripped from body).
    // User info is included by Ares as json.user.
    if (json.user) {
      const user = json.user;
      localStorage.setItem('gh_login', user.login);
      localStorage.setItem('gh_name', user.name ?? user.login);
      localStorage.setItem('gh_avatar_url', user.avatar_url ?? '');
      if (json.scope) localStorage.setItem('gh_token_scope', json.scope);
      if (json.token_type) localStorage.setItem('gh_token_type', json.token_type);
      console.log('[GH] Device flow complete:', user.login);
      return {
        login: user.login,
        name: user.name ?? user.login,
        avatarUrl: user.avatar_url ?? '',
      };
    }

    const error = json.error;
    console.log('[GH] Polling... status:', error);

    if (error === 'authorization_pending') {
      continue;
    } else if (error === 'slow_down') {
      interval += 5000;
      continue;
    } else if (error === 'expired_token') {
      throw new Error('gh_device_expired');
    } else if (error === 'access_denied') {
      throw new Error('gh_device_denied');
    } else if (error) {
      throw new Error(json.error_description || error || 'Unknown device flow error');
    }
  }

  throw new Error('gh_device_timeout');
}

// ── PAT Flow ─────────────────────────────────────────────────

/**
 * Validate a Personal Access Token via Ares → Hermes → GitHub.
 * Ares validates, sets __Host-gh_access cookie, returns user info.
 */
export async function validateAndStoreToken(pat: string): Promise<GitHubUser> {
  const res = await fetch(`${getGatewayUrl()}/v1/github/auth/pat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token: pat }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.message || json?.error || `GitHub returned ${res.status}`);
  }

  const user = json.user;
  localStorage.setItem('gh_login', user.login);
  localStorage.setItem('gh_name', user.name ?? user.login);
  localStorage.setItem('gh_avatar_url', user.avatar_url ?? '');
  console.log('[GH] PAT validated for:', user.login);

  return {
    login: user.login,
    name: user.name ?? user.login,
    avatarUrl: user.avatar_url ?? '',
  };
}

// ── Disconnect ───────────────────────────────────────────────

export function disconnectGitHub(): void {
  fetch(`${getGatewayUrl()}/v1/github/auth/revoke`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {}); // fire and forget
  localStorage.removeItem('gh_login');
  localStorage.removeItem('gh_name');
  localStorage.removeItem('gh_avatar_url');
  localStorage.removeItem('gh_token_scope');
  localStorage.removeItem('gh_token_type');
  console.log('[GH] Disconnected');
}

export function isGitHubConnected(): boolean {
  return !!localStorage.getItem('gh_login');
}

export function getStoredGitHubUser(): GitHubUser | null {
  const login = localStorage.getItem('gh_login');
  if (!login) return null;
  return {
    login,
    name: localStorage.getItem('gh_name') ?? login,
    avatarUrl: localStorage.getItem('gh_avatar_url') ?? '',
  };
}

export function getGitHubClientId(): string {
  return GH_CLIENT_ID;
}

// ── Startup Validation ───────────────────────────────────────

export async function validateGitHubToken(): Promise<void> {
  const login = localStorage.getItem('gh_login');
  if (!login) return;

  console.log('[GH] Validating stored session via cookie...');
  try {
    // Token flows as: __Host-gh_access cookie → x-github-token header (Ares)
    const res = await fetch(`${getGatewayUrl()}/v1/github/user`, {
      credentials: 'include',
    });

    if (res.status === 401 || res.status === 400) {
      console.warn('[GH] Stored token is invalid/expired — clearing');
      disconnectGitHub();
      return;
    }

    const json = await res.json();
    localStorage.setItem('gh_login', json.login);
    localStorage.setItem('gh_name', json.name ?? json.login);
    localStorage.setItem('gh_avatar_url', json.avatar_url ?? '');
    console.log('[GH] Token valid for:', json.login);
  } catch (err) {
    console.warn('[GH] Token validation failed — session may require re-auth', err);
  }
}

// ── Connection Test ──────────────────────────────────────────

export interface GhTestStep {
  label: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
  durationMs: number;
}

export interface GhTestConnectionResult {
  overall: 'pass' | 'fail';
  steps: GhTestStep[];
}

export async function testGitHubConnection(): Promise<GhTestConnectionResult> {
  const steps: GhTestStep[] = [];
  const login = localStorage.getItem('gh_login');

  console.log('[GH] TEST -- Connection Test Start --');

  if (!login) {
    steps.push({ label: 'Connection check', status: 'fail', detail: 'No GitHub login — not connected', durationMs: 0 });
    return { overall: 'fail', steps };
  }

  // 1. User endpoint — token sent via httpOnly cookie through Ares → Hermes relay
  const t0 = performance.now();
  try {
    const res = await fetch(`${getGatewayUrl()}/v1/github/user`, {
      credentials: 'include',
    });
    const json = await res.json();
    const ms = Math.round(performance.now() - t0);
    if (res.ok) {
      steps.push({ label: 'Authenticated user', status: 'pass', detail: `${json.login} (${ms}ms)`, durationMs: ms });
    } else {
      steps.push({ label: 'Authenticated user', status: 'fail', detail: `${res.status}: ${json.message}`, durationMs: ms });
    }
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    steps.push({ label: 'Authenticated user', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[GH] TEST -- Connection Test ${overall.toUpperCase()} --`, steps);
  return { overall, steps };
}

// ── Util ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
