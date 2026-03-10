// ── Google OAuth 2.0 + PKCE Client ────────────────────────────
// Auth tokens are httpOnly cookies managed by Ares.
// Token exchange: TSW → Ares → Hermes → googleapis.com
// API calls: TSW → Ares → Hermes → googleapis.com (cookie → header injection)

import { useEnvironmentStore } from '@/lib/store/environment-store';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  (() => {
    console.warn('[GOOGLE] VITE_GOOGLE_CLIENT_ID not set — using hardcoded fallback');
    return '941617801399-8usobm0k69p520a5tibjnm999vkup9nr.apps.googleusercontent.com';
  })();

const GOOGLE_CALLBACK_URL = `${window.location.origin}/oauth/callback/google`;

function getGatewayUrl(): string {
  return useEnvironmentStore.getState().getGatewayUrl();
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

  // Store in localStorage (not sessionStorage) to survive origin changes during redirect
  localStorage.setItem('google_pkce_verifier', verifier);
  localStorage.setItem('google_oauth_state', state);

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

/**
 * Exchange authorization code for tokens via Ares → Hermes → Google.
 * Ares intercepts the response and sets __Host-google_access / __Host-google_refresh cookies.
 * Ares also fetches userinfo and includes it in the response.
 */
export async function exchangeCodeForTokens(code: string, state: string): Promise<GoogleUser> {
  const savedState = localStorage.getItem('google_oauth_state');
  if (state !== savedState) {
    throw new Error('google_state_mismatch');
  }

  const verifier = localStorage.getItem('google_pkce_verifier');
  if (!verifier) {
    throw new Error('PKCE session data missing — please retry the login flow');
  }

  console.log('[GOOGLE] Exchanging authorization code for tokens via Ares...');

  const response = await fetch(`${getGatewayUrl()}/v1/google/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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

  console.log('[GOOGLE] Token exchange successful');

  // Tokens are set as httpOnly cookies by Ares (stripped from response body).
  // Store non-sensitive metadata only.
  if (json.expires_in) localStorage.setItem('google_token_expiry', String(Date.now() + (json.expires_in * 1000)));
  if (json.scope) localStorage.setItem('google_token_scope', json.scope);

  // Clean up PKCE state
  localStorage.removeItem('google_pkce_verifier');
  localStorage.removeItem('google_oauth_state');

  // User info is included in the response by Ares
  const user = json.user;
  if (user) {
    localStorage.setItem('google_user_email', user.email);
    localStorage.setItem('google_user_name', user.name ?? user.email);
    localStorage.setItem('google_user_picture', user.picture ?? '');
    localStorage.setItem('google_user_id', user.sub);

    return {
      email: user.email,
      name: user.name ?? user.email,
      picture: user.picture ?? '',
      sub: user.sub,
    };
  }

  throw new Error('User info not available after token exchange');
}

/**
 * Refresh the Google access token via Ares → Hermes → Google.
 * Ares reads __Host-google_refresh cookie and forwards to Hermes.
 */
export async function refreshGoogleToken(): Promise<void> {
  console.log('[GOOGLE] Refreshing access token via Ares...');

  const response = await fetch(`${getGatewayUrl()}/v1/google/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: GOOGLE_CLIENT_ID,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    console.error('[GOOGLE] Token refresh failed:', json);
    clearGoogleTokens();
    throw new Error('google_refresh_failed');
  }

  console.log('[GOOGLE] Token refreshed');
  if (json.expires_in) localStorage.setItem('google_token_expiry', String(Date.now() + (json.expires_in * 1000)));
}

// ── User Info ────────────────────────────────────────────────

export async function getGoogleUser(): Promise<GoogleUser> {
  const email = localStorage.getItem('google_user_email');
  if (!email) throw new Error('Not connected to Google');

  // Token flows as: __Host-google_access cookie → x-google-token header (Ares)
  // → Authorization: Bearer (Hermes Google relay)
  let res = await fetch(`${getGatewayUrl()}/v1/google/userinfo`, {
    credentials: 'include',
  });

  if (res.status === 401) {
    console.log('[GOOGLE] 401 received — attempting token refresh...');
    await refreshGoogleToken();
    res = await fetch(`${getGatewayUrl()}/v1/google/userinfo`, {
      credentials: 'include',
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

/**
 * Disconnect — clear httpOnly cookies via Ares, clean up localStorage.
 */
export function disconnectGoogle(): void {
  fetch(`${getGatewayUrl()}/v1/google/auth/revoke`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {}); // fire and forget
  clearGoogleTokens();
  console.log('[GOOGLE] Disconnected');
}

function clearGoogleTokens(): void {
  localStorage.removeItem('google_token_expiry');
  localStorage.removeItem('google_token_scope');
  localStorage.removeItem('google_user_email');
  localStorage.removeItem('google_user_name');
  localStorage.removeItem('google_user_picture');
  localStorage.removeItem('google_user_id');
  localStorage.removeItem('google_pkce_verifier');
  localStorage.removeItem('google_oauth_state');
}

export function isGoogleConnected(): boolean {
  return !!localStorage.getItem('google_user_email');
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
  const email = localStorage.getItem('google_user_email');

  console.log('[GOOGLE] TEST -- Connection Test Start --');

  if (!email) {
    steps.push({ label: 'Connection check', status: 'fail', detail: 'No Google email — not connected', durationMs: 0 });
    return { overall: 'fail', steps };
  }

  // 1. User info endpoint — token sent via httpOnly cookie through Ares → Hermes relay
  const t0 = performance.now();
  try {
    const res = await fetch(`${getGatewayUrl()}/v1/google/userinfo`, {
      credentials: 'include',
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

  // 2. Token refresh
  const t1 = performance.now();
  try {
    await refreshGoogleToken();
    const ms = Math.round(performance.now() - t1);
    steps.push({ label: 'Token refresh', status: 'pass', detail: `Refresh successful (${ms}ms)`, durationMs: ms });
  } catch (err) {
    const ms = Math.round(performance.now() - t1);
    steps.push({ label: 'Token refresh', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  // 3. Post-refresh API call
  const t2 = performance.now();
  try {
    const res = await fetch(`${getGatewayUrl()}/v1/google/userinfo`, {
      credentials: 'include',
    });
    const json = await res.json();
    const ms = Math.round(performance.now() - t2);
    if (res.ok) {
      steps.push({ label: 'Post-refresh API call', status: 'pass', detail: `${json.email} (${ms}ms)`, durationMs: ms });
    } else {
      steps.push({ label: 'Post-refresh API call', status: 'fail', detail: `${res.status}: ${json.error?.message || res.statusText}`, durationMs: ms });
    }
  } catch (err) {
    const ms = Math.round(performance.now() - t2);
    steps.push({ label: 'Post-refresh API call', status: 'fail', detail: err instanceof Error ? err.message : String(err), durationMs: ms });
  }

  const overall = steps.every((s) => s.status !== 'fail') ? 'pass' : 'fail';
  console.log(`[GOOGLE] TEST -- Connection Test ${overall.toUpperCase()} --`, steps);
  return { overall, steps };
}
