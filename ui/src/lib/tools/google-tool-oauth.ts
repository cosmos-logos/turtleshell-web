// lib/tools/google-tool-oauth.ts
//
// Per-agent Google OAuth flow. Parallel to the Salesforce tool-oauth
// module — same sovereignty contract: tokens returned by the token
// exchange are IMMEDIATELY sealed to the Google tool server's public
// key and the plaintext is dropped. Nothing persists in localStorage
// for this flow; nothing in a cookie the browser can read. The only
// durable artifact is the sealed envelope in the tool-bindings store.
//
// The legacy `lib/api/google-client.ts` uses localStorage for PKCE
// state and was deprecated in the same sweep that deprecated the
// Salesforce legacy flow. This file owns the per-agent Google path.

import { useEnvironmentStore } from '@/lib/store/environment-store';
import { sealForToolServer } from './poseidon-seal';
import { addToolBinding, type ToolBinding } from '@/lib/store/tool-bindings-store';

// Default Google OAuth 2.0 client ID. Used only as a convenience
// fallback for users who have the TurtleShell-canonical client
// pre-provisioned; everyone else brings their own via the wizard.
const GOOGLE_CLIENT_ID_DEFAULT =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '941617801399-8usobm0k69p520a5tibjnm999vkup9nr.apps.googleusercontent.com';

const TOOL_CALLBACK_URL = `${window.location.origin}/oauth/tool-callback/google`;

const SESSION_KEY_VERIFIER = 'sf_tool_pkce_verifier_google';
const SESSION_KEY_STATE    = 'sf_tool_oauth_state_google';
const SESSION_KEY_CONTEXT  = 'sf_tool_binding_context_google';

// Scopes the Google tool handlers need. Reads-only by default — the
// wizard can advertise write access as a future follow-up if/when
// we expose create/update tools.
const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/documents.readonly',
].join(' ');

function getGatewayUrl(): string {
  return useEnvironmentStore.getState().getGatewayUrl();
}

// ── PKCE helpers ─────────────────────────────────────────────

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
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
}

async function generateChallenge(verifier: string): Promise<string> {
  return base64UrlEncode(await sha256(verifier));
}

// ── Flow entry ───────────────────────────────────────────────

export interface GoogleToolContext {
  agentId: string;
  toolServerCodename: string;
  toolDisplayName: string;
  manifestUrl: string;
  mcpUrl: string;
  color?: string;
  icon?: string;
  /** OAuth client_id the user pasted in the wizard. Travels through
   *  the OAuth roundtrip in sessionStorage (NOT localStorage); after
   *  the seal it rides in the sealed envelope. */
  clientId?: string;
}

export async function startGoogleToolOAuth(context: GoogleToolContext): Promise<string> {
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  const state = generateState();

  sessionStorage.setItem(SESSION_KEY_VERIFIER, verifier);
  sessionStorage.setItem(SESSION_KEY_STATE, state);
  sessionStorage.setItem(SESSION_KEY_CONTEXT, JSON.stringify(context));

  const clientId = context.clientId?.trim() || GOOGLE_CLIENT_ID_DEFAULT;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: TOOL_CALLBACK_URL,
    scope: GOOGLE_SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    // `access_type=offline` + `prompt=consent` together are how you
    // ask Google for a refresh_token. Without this, Google returns
    // only a short-lived access_token and the user has to go through
    // consent every hour. Our server-side refresh path hard-requires
    // the refresh_token, so both params are mandatory.
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function completeGoogleToolOAuth(code: string, state: string): Promise<{
  agentDisplayName: string;
  toolDisplayName: string;
  toolServerCodename: string;
}> {
  const savedState = sessionStorage.getItem(SESSION_KEY_STATE);
  if (!savedState || savedState !== state) {
    throw new Error('OAuth state mismatch — possible CSRF attempt. Please retry from the Tools page.');
  }

  const verifier = sessionStorage.getItem(SESSION_KEY_VERIFIER);
  const contextRaw = sessionStorage.getItem(SESSION_KEY_CONTEXT);
  if (!verifier || !contextRaw) {
    throw new Error('PKCE session data missing — please retry from the Tools page.');
  }

  const context: GoogleToolContext = JSON.parse(contextRaw);
  const clientId = context.clientId?.trim() || GOOGLE_CLIENT_ID_DEFAULT;

  // Token exchange goes through the existing Ares proxy since Google's
  // token endpoint doesn't support browser CORS. Same Phase-0 httpOnly
  // cookie leak applies (Ares sets __Host-google_access briefly); next
  // hardening phase moves Google token exchange to a cookie-less Ares
  // endpoint (header-only-ephemeral), same fix as SF.
  const response = await fetch(`${getGatewayUrl()}/v1/google/auth/token`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-token-delivery': 'header',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: TOOL_CALLBACK_URL,
      code,
      code_verifier: verifier,
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error_description || json.error || 'Token exchange failed');
  }

  // Tokens live in JS memory from here until the seal completes ~20ms
  // later. After that, only the sealed envelope persists; plaintext
  // goes out of scope and the GC reclaims it (best effort).
  const accessToken = response.headers.get('x-google-access-token') || json.access_token;
  const refreshToken = response.headers.get('x-google-refresh-token') || json.refresh_token;
  const tokenType = json.token_type;
  const expiresIn = json.expires_in;
  const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;

  if (!accessToken) {
    throw new Error('Token exchange returned no usable credentials.');
  }
  if (!refreshToken) {
    // Without a refresh_token, server-side refresh in Poseidon will
    // fail after ~1 hour. Fail loudly now rather than later when the
    // user gets a mysterious 401 from Google mid-conversation.
    throw new Error(
      'Google did not return a refresh_token. Check that your OAuth client was configured with access_type=offline and that "prompt=consent" was honored.',
    );
  }

  const { sealedEnvelope, toolServerCodename } = await sealForToolServer(context.manifestUrl, {
    access_token: accessToken,
    refresh_token: refreshToken,
    client_id: clientId,
    token_type: tokenType,
    expires_at: expiresAt,
    sealed_for: context.toolServerCodename,
  });

  if (toolServerCodename !== context.toolServerCodename) {
    throw new Error(
      `Manifest codename mismatch: expected ${context.toolServerCodename}, got ${toolServerCodename}.`,
    );
  }

  const binding: ToolBinding = {
    toolServerCodename: context.toolServerCodename,
    displayName: context.toolDisplayName,
    mcpUrl: context.mcpUrl,
    manifestUrl: context.manifestUrl,
    sealedEnvelope,
    addedAt: new Date().toISOString(),
    color: context.color,
    icon: context.icon,
  };

  addToolBinding(context.agentId, binding);

  wipeWizardStaging();

  return {
    agentDisplayName: context.agentId,
    toolDisplayName: context.toolDisplayName,
    toolServerCodename: context.toolServerCodename,
  };
}

/** Abandon the in-flight flow (user hit Back in the wizard). */
export function cancelGoogleToolOAuth(): void {
  wipeWizardStaging();
}

/**
 * Same contract as the Salesforce wizard's cleanup: after a flow
 * session, no localStorage or sessionStorage key that this flow
 * wrote (or that its legacy counterpart might have written) survives.
 * Prefix sweep + explicit legacy list for defense in depth.
 */
function wipeWizardStaging(): void {
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (
        k.startsWith('sf_tool_pkce_verifier_google') ||
        k.startsWith('sf_tool_oauth_state_google') ||
        k.startsWith('sf_tool_binding_context_google')
      ) {
        sessionStorage.removeItem(k);
      }
    }
    sessionStorage.removeItem(SESSION_KEY_VERIFIER);
    sessionStorage.removeItem(SESSION_KEY_STATE);
    sessionStorage.removeItem(SESSION_KEY_CONTEXT);
  } catch {
    // non-fatal
  }

  // Legacy google-client.ts wrote these directly to localStorage.
  // Tool flow owns Google credential storage now (ciphertext only);
  // wipe any stale plaintext left by the old code path.
  try {
    const LEGACY_GOOGLE_PLAINTEXT_KEYS = [
      'google_pkce_verifier',
      'google_oauth_state',
      'google_token_expiry',
      'google_token_scope',
      'google_user_email',
      'google_user_name',
      'google_user_picture',
      'google_user_id',
    ];
    for (const k of LEGACY_GOOGLE_PLAINTEXT_KEYS) localStorage.removeItem(k);
  } catch {
    // non-fatal
  }
}
