// ── GitHub OAuth Device Flow + PAT Client ─────────────────────
// Uses x-github-token header for Poseidon MCP tool calls.
// Device Flow requires no client_secret (public OAuth App).
// OAuth requests are relayed through Hermes to avoid CORS.

import { useEnvironmentStore } from '@/lib/store/environment-store';

const GH_CLIENT_ID = import.meta.env.VITE_GH_CLIENT_ID || (() => {
  console.warn('[GH] VITE_GH_CLIENT_ID not set — GitHub Device Flow will fail');
  return '';
})();

const GH_API = 'https://api.github.com';

function getHermesUrl(): string {
  return useEnvironmentStore.getState().getHermesUrl();
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
  console.log('[GH] Starting device flow...');

  const res = await fetch(`${getHermesUrl()}/github/device/code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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

    const res = await fetch(`${getHermesUrl()}/github/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GH_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const json = await res.json();

    if (json.access_token) {
      const user = await fetchAndStoreUser(json.access_token);
      if (json.scope) localStorage.setItem('gh_token_scope', json.scope);
      if (json.token_type) localStorage.setItem('gh_token_type', json.token_type);
      console.log('[GH] Device flow complete:', user.login);
      return user;
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
    } else {
      throw new Error(json.error_description || error || 'Unknown device flow error');
    }
  }

  throw new Error('gh_device_timeout');
}

// ── PAT Flow ─────────────────────────────────────────────────

export async function validateAndStoreToken(pat: string): Promise<GitHubUser> {
  const res = await fetch(`${GH_API}/user`, {
    headers: { 'Authorization': `Bearer ${pat}` },
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message || `GitHub returned ${res.status}`);
  }

  const user = await fetchAndStoreUser(pat);
  console.log('[GH] PAT validated for:', user.login);
  return user;
}

// ── Shared ───────────────────────────────────────────────────

async function fetchAndStoreUser(token: string): Promise<GitHubUser> {
  const res = await fetch(`${GH_API}/user`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch GitHub user (${res.status})`);
  }

  const json = await res.json();

  localStorage.setItem('gh_access_token', token);
  localStorage.setItem('gh_login', json.login);
  localStorage.setItem('gh_name', json.name ?? json.login);
  localStorage.setItem('gh_avatar_url', json.avatar_url ?? '');

  return {
    login: json.login,
    name: json.name ?? json.login,
    avatarUrl: json.avatar_url ?? '',
  };
}

export function disconnectGitHub(): void {
  localStorage.removeItem('gh_access_token');
  localStorage.removeItem('gh_login');
  localStorage.removeItem('gh_name');
  localStorage.removeItem('gh_avatar_url');
  localStorage.removeItem('gh_token_scope');
  localStorage.removeItem('gh_token_type');
  console.log('[GH] Disconnected');
}

export function isGitHubConnected(): boolean {
  return !!localStorage.getItem('gh_access_token');
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
  const token = localStorage.getItem('gh_access_token');
  if (!token) return;

  console.log('[GH] Validating stored token...');
  try {
    const res = await fetch(`${GH_API}/user`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.status === 401) {
      console.warn('[GH] Stored token is invalid/expired — clearing');
      disconnectGitHub();
      return;
    }

    const json = await res.json();
    // Update cached user info
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
  const token = localStorage.getItem('gh_access_token');

  console.log('[GH] TEST -- Connection Test Start --');

  if (!token) {
    steps.push({ label: 'Token check', status: 'fail', detail: 'No access token in localStorage', durationMs: 0 });
    return { overall: 'fail', steps };
  }

  // 1. User endpoint
  const t0 = performance.now();
  try {
    const res = await fetch(`${GH_API}/user`, {
      headers: { 'Authorization': `Bearer ${token}` },
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

  // 2. Repos list
  const t1 = performance.now();
  try {
    const res = await fetch(`${GH_API}/user/repos?per_page=1`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const ms = Math.round(performance.now() - t1);
    if (res.ok) {
      steps.push({ label: 'Repository access', status: 'pass', detail: `200 (${ms}ms)`, durationMs: ms });
    } else {
      const json = await res.json().catch(() => null);
      steps.push({ label: 'Repository access', status: 'fail', detail: `${res.status}: ${json?.message || res.statusText}`, durationMs: ms });
    }
  } catch (err) {
    const ms = Math.round(performance.now() - t1);
    steps.push({ label: 'Repository access', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[GH] TEST -- Connection Test ${overall.toUpperCase()} --`, steps);
  return { overall, steps };
}

// ── Util ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
