// ── Google OAuth 2.0 + PKCE Client (LEGACY / DEPRECATED) ──────
//
// Parallel to salesforce-client.ts — same sovereignty invariant:
//
//   Google credentials MUST NOT be available in the browser unless
//   they are encrypted to the Poseidon Google tool-server's public key.
//
// This module used to run the Services-page Google OAuth flow and
// store PKCE/verifier state + user metadata as plaintext in
// localStorage. That path is retired. The correct entry point is the
// per-agent Tools flow (ui/src/lib/tools/google-tool-oauth.ts), which
// seals tokens on the device before persistence.
//
// Entry-point functions below (`getGoogleLoginUrl`, `exchangeCodeForTokens`,
// `refreshGoogleToken`) throw so nothing in the app can re-introduce
// plaintext Google credentials. The probe functions
// (`isGoogleConnected`, `getStoredGoogleUser`) return neutral values
// so still-extant call sites (e.g. `useStartupRefresh`) degrade
// quietly. `scrubLegacyGoogleCredentials` wipes any stale plaintext
// keys on module import — same belt-and-suspenders pattern as SF.

import { useEnvironmentStore } from '@/lib/store/environment-store';

/**
 * Keys the legacy Google flow used to write. Centralized so the
 * scrubber, logout wipe, and any future audit code reference the
 * same list. These are legacy-only — the per-agent Tools flow
 * never writes any of these; if any appear, something regressed.
 */
export const LEGACY_GOOGLE_PLAINTEXT_KEYS = [
  'google_pkce_verifier',
  'google_oauth_state',
  'google_token_expiry',
  'google_token_scope',
  'google_user_email',
  'google_user_name',
  'google_user_picture',
  'google_user_id',
] as const;

/**
 * Wipe any plaintext Google keys the legacy flow may have written.
 * Runs on module import (bottom of file), on any legacy entry point
 * throw, and as part of logout wipe. A non-zero find logs warn — a
 * regression signal.
 */
export function scrubLegacyGoogleCredentials(): void {
  let found = 0;
  for (const k of LEGACY_GOOGLE_PLAINTEXT_KEYS) {
    try {
      if (localStorage.getItem(k) !== null) {
        localStorage.removeItem(k);
        found++;
      }
    } catch {
      // non-fatal
    }
  }
  if (found > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Google sovereignty guard] scrubbed ${found} legacy plaintext Google key(s) from localStorage. ` +
      `Investigate any path that could write these; the invariant is ciphertext-only.`,
    );
  }
}

scrubLegacyGoogleCredentials();

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
// Helpers retained only so still-imported signatures compile; the
// legacy Services flow is retired and all entry points below throw.
// PKCE helpers stay for any future refactor that resurrects a direct
// browser-to-Google flow (Google doesn't support CORS on /token so
// that's unlikely without infrastructure changes).
void generateVerifier;
void generateState;
void generateChallenge;
void GOOGLE_SCOPES;
void GOOGLE_CALLBACK_URL;
void GOOGLE_CLIENT_ID;

export async function getGoogleLoginUrl(): Promise<string> {
  scrubLegacyGoogleCredentials();
  throw new Error(
    'The Services Google flow has been retired. Use Tools → Add a tool → Google Workspace.',
  );
}

/**
 * DEPRECATED — legacy Services-flow Google token exchange. Retired
 * with the same sovereignty rationale as the SF equivalent. Throws;
 * the per-agent Tools flow (lib/tools/google-tool-oauth.ts) is the
 * only code path that may turn an auth code into tokens, and it
 * seals before persisting.
 */
export async function exchangeCodeForTokens(_code: string, _state: string): Promise<GoogleUser> {
  scrubLegacyGoogleCredentials();
  throw new Error(
    'The Services Google flow has been retired. Connect Google Workspace through Tools → Add a tool → Google Workspace, which seals your credentials on your device before any persistence. The app never stores plaintext Google tokens.',
  );
}

/** DEPRECATED — see exchangeCodeForTokens above. Refresh now runs
 *  server-side inside Poseidon, driven by the sealed envelope. */
export async function refreshGoogleToken(): Promise<void> {
  scrubLegacyGoogleCredentials();
  throw new Error('google_session_expired');
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
