// ── Google OAuth 2.0 + PKCE Client ────────────────────────────
// Uses x-google-token header for Poseidon MCP tool calls.
// PKCE flow — client_secret injected server-side by Hermes relay.

import { useEnvironmentStore } from '@/lib/store/environment-store';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  (() => {
    console.warn('[GOOGLE] VITE_GOOGLE_CLIENT_ID not set — using hardcoded fallback');
    return '941617801399-8usobm0k69p520a5tibjnm999vkup9nr.apps.googleusercontent.com';
  })();

const GOOGLE_CALLBACK_URL = `${window.location.origin}/oauth/callback/google`;

function getHermesUrl(): string {
  return useEnvironmentStore.getState().getHermesUrl();
}

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

// ── Types ────────────────────────────────────────────────────

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  sub: string;
}

// ── PKCE Helpers (Web Crypto) ────────────────────────────────

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

function generateState(): string {
  const array = new Uint8Array(16);
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

export async function getGoogleLoginUrl(): Promise<string> {
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  const state = generateState();

  sessionStorage.setItem('google_pkce_verifier', verifier);
  sessionStorage.setItem('google_oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    scope: GOOGLE_SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  console.log('[GOOGLE] OAuth redirect initiated');
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, state: string): Promise<GoogleUser> {
  const savedState = sessionStorage.getItem('google_oauth_state');
  if (state !== savedState) {
    throw new Error('google_state_mismatch');
  }

  const verifier = sessionStorage.getItem('google_pkce_verifier');
  if (!verifier) {
    throw new Error('PKCE session data missing — please retry the login flow');
  }

  console.log('[GOOGLE] Exchanging authorization code for tokens...');

  const response = await fetch(`${getHermesUrl()}/google/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_CALLBACK_URL,
      code_verifier: verifier,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    console.error('[GOOGLE] Token exchange failed:', json);
    throw new Error(json.error_description || json.error || 'Token exchange failed');
  }

  localStorage.setItem('google_access_token', json.access_token);
  localStorage.setItem('google_token_expiry', String(Date.now() + (json.expires_in * 1000)));
  if (json.scope) localStorage.setItem('google_token_scope', json.scope);
  if (json.refresh_token) {
    localStorage.setItem('google_refresh_token', json.refresh_token);
  }

  sessionStorage.removeItem('google_pkce_verifier');
  sessionStorage.removeItem('google_oauth_state');

  const user = await fetchAndStoreUser(json.access_token);
  console.log('[GOOGLE] Token exchange complete');
  return user;
}

export async function refreshGoogleToken(): Promise<string> {
  const refreshToken = localStorage.getItem('google_refresh_token');

  if (!refreshToken) {
    throw new Error('google_refresh_failed');
  }

  console.log('[GOOGLE] Refreshing access token...');

  const response = await fetch(`${getHermesUrl()}/google/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: GOOGLE_CLIENT_ID,
      refresh_token: refreshToken,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    console.error('[GOOGLE] Token refresh failed:', json);
    clearGoogleTokens();
    throw new Error('google_refresh_failed');
  }

  console.log('[GOOGLE] Token refreshed');
  localStorage.setItem('google_access_token', json.access_token);
  localStorage.setItem('google_token_expiry', String(Date.now() + (json.expires_in * 1000)));

  return json.access_token;
}

// ── User Info ────────────────────────────────────────────────

async function fetchAndStoreUser(token: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Google user info (${res.status})`);
  }

  const json = await res.json();

  localStorage.setItem('google_user_email', json.email);
  localStorage.setItem('google_user_name', json.name ?? json.email);
  localStorage.setItem('google_user_picture', json.picture ?? '');
  localStorage.setItem('google_user_id', json.sub);

  return {
    email: json.email,
    name: json.name ?? json.email,
    picture: json.picture ?? '',
    sub: json.sub,
  };
}

export async function getGoogleUser(): Promise<GoogleUser> {
  const token = localStorage.getItem('google_access_token');
  if (!token) throw new Error('Not connected to Google');

  let res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (res.status === 401) {
    console.log('[GOOGLE] 401 received — attempting token refresh...');
    const newToken = await refreshGoogleToken();
    res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${newToken}` },
    });
    if (!res.ok) throw new Error('google_token_invalid');
  }

  if (!res.ok) throw new Error(`Google API error (${res.status})`);

  const json = await res.json();
  return {
    email: json.email,
    name: json.name ?? json.email,
    picture: json.picture ?? '',
    sub: json.sub,
  };
}

// ── Disconnect ───────────────────────────────────────────────

export function disconnectGoogle(): void {
  clearGoogleTokens();
  console.log('[GOOGLE] Disconnected');
}

function clearGoogleTokens(): void {
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_refresh_token');
  localStorage.removeItem('google_token_expiry');
  localStorage.removeItem('google_token_scope');
  localStorage.removeItem('google_user_email');
  localStorage.removeItem('google_user_name');
  localStorage.removeItem('google_user_picture');
  localStorage.removeItem('google_user_id');
}

export function isGoogleConnected(): boolean {
  return !!localStorage.getItem('google_access_token');
}

export function isGoogleTokenExpired(): boolean {
  const expiry = localStorage.getItem('google_token_expiry');
  if (!expiry) return true;
  return Date.now() > (Number(expiry) - 60000);
}

export function getStoredGoogleUser(): GoogleUser | null {
  const email = localStorage.getItem('google_user_email');
  if (!email) return null;
  return {
    email,
    name: localStorage.getItem('google_user_name') ?? email,
    picture: localStorage.getItem('google_user_picture') ?? '',
    sub: localStorage.getItem('google_user_id') ?? '',
  };
}

export function getGoogleClientId(): string {
  return GOOGLE_CLIENT_ID;
}

// ── Connection Test ──────────────────────────────────────────

export interface GoogleTestStep {
  label: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
  durationMs: number;
}

export interface GoogleTestConnectionResult {
  overall: 'pass' | 'fail';
  steps: GoogleTestStep[];
}

export async function testGoogleConnection(): Promise<GoogleTestConnectionResult> {
  const steps: GoogleTestStep[] = [];
  const token = localStorage.getItem('google_access_token');

  console.log('[GOOGLE] TEST -- Connection Test Start --');

  if (!token) {
    steps.push({ label: 'Token check', status: 'fail', detail: 'No access token in localStorage', durationMs: 0 });
    return { overall: 'fail', steps };
  }

  // 1. User info endpoint
  const t0 = performance.now();
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();
    const ms = Math.round(performance.now() - t0);
    if (res.ok) {
      steps.push({ label: 'Authenticated user', status: 'pass', detail: `${json.email} (${ms}ms)`, durationMs: ms });
    } else {
      steps.push({ label: 'Authenticated user', status: 'fail', detail: `${res.status}: ${json.error?.message || res.statusText}`, durationMs: ms });
    }
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    steps.push({ label: 'Authenticated user', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  // 2. Calendar access
  const t1 = performance.now();
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const ms = Math.round(performance.now() - t1);
    if (res.ok) {
      steps.push({ label: 'Calendar access', status: 'pass', detail: `200 (${ms}ms)`, durationMs: ms });
    } else {
      const json = await res.json().catch(() => null);
      steps.push({ label: 'Calendar access', status: 'fail', detail: `${res.status}: ${json?.error?.message || res.statusText}`, durationMs: ms });
    }
  } catch (err) {
    const ms = Math.round(performance.now() - t1);
    steps.push({ label: 'Calendar access', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  // 3. Token refresh
  const refreshToken = localStorage.getItem('google_refresh_token');
  if (refreshToken) {
    const originalToken = localStorage.getItem('google_access_token');
    const t2 = performance.now();
    try {
      const newToken = await refreshGoogleToken();
      const ms = Math.round(performance.now() - t2);
      const changed = newToken !== originalToken;
      steps.push({ label: 'Token refresh', status: 'pass', detail: `New token issued (${ms}ms)${changed ? '' : ' — same token returned'}`, durationMs: ms });
    } catch (err) {
      const ms = Math.round(performance.now() - t2);
      steps.push({ label: 'Token refresh', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
    }
  } else {
    steps.push({ label: 'Token refresh', status: 'skip', detail: 'No refresh token in localStorage', durationMs: 0 });
  }

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[GOOGLE] TEST -- Connection Test ${overall.toUpperCase()} --`, steps);
  return { overall, steps };
}
