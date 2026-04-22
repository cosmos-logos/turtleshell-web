// lib/tools/salesforce-tool-oauth.ts
//
// Per-agent Salesforce OAuth flow. Parallel to the legacy
// `lib/api/salesforce-client.ts` Services flow, but with one critical
// difference: tokens returned by the token-exchange endpoint are
// IMMEDIATELY sealed to the tool server's public key and the plaintext
// is dropped. Nothing persists in localStorage. Nothing persists in
// cookies the client can read. The only durable artifact is the
// sealed envelope stored in the tool-bindings store.
//
// We intentionally use different PKCE session keys than the legacy
// flow so running the two in parallel doesn't let one overwrite the
// other's verifier.

import { useEnvironmentStore } from '@/lib/store/environment-store';
import { sealForToolServer } from './poseidon-seal';
import { addToolBinding, type ToolBinding } from '@/lib/store/tool-bindings-store';

// Default Consumer Key. Shipped as a fallback for users who connect to
// an org where TurtleShell's canonical Connected App is pre-installed.
// Until that exists in production, every user brings their own — the
// wizard exposes a required field and the value rides in the context
// blob below (NOT in localStorage).
const SF_CLIENT_ID_DEFAULT =
  import.meta.env.VITE_SF_CLIENT_ID ||
  '3MVG9nSH73I5aFNiVgku4fbvk1TBGkXFlEAB7fE7tLMNYPvE5CGkOv5HQGsRCWSwbhpgZYvy5z1xV_GjoeuGd';

const TOOL_CALLBACK_URL = `${window.location.origin}/oauth/tool-callback/salesforce`;

const SESSION_KEY_VERIFIER = 'sf_tool_pkce_verifier';
const SESSION_KEY_INSTANCE = 'sf_tool_login_instance_url';
const SESSION_KEY_CONTEXT = 'sf_tool_binding_context';

function getGatewayUrl(): string {
  return useEnvironmentStore.getState().getGatewayUrl();
}

// ── PKCE helpers (Web Crypto, same pattern as salesforce-client.ts) ─

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
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
}

async function generateChallenge(verifier: string): Promise<string> {
  return base64UrlEncode(await sha256(verifier));
}

// ── Flow entry: called by the Salesforce tool wizard ───────────

export interface SalesforceToolContext {
  agentId: string;
  toolServerCodename: string;
  toolDisplayName: string;
  manifestUrl: string;
  mcpUrl: string;
  color?: string;
  icon?: string;
  /**
   * The OAuth Consumer Key (client_id) the wizard collected.
   * Carried through the OAuth roundtrip in sessionStorage so it
   * reaches the callback — NEVER written to localStorage. After
   * seal, the client_id is baked into the sealed envelope and this
   * transient copy is wiped with the rest of the wizard context.
   */
  clientId?: string;
}

/**
 * Build the SF authorize URL and stash the context the callback
 * will need. Context lives in sessionStorage so it's tab-scoped
 * and volatile — a cleaner fit for an ephemeral OAuth roundtrip
 * than localStorage (which the existing Services flow uses because
 * it expects the tokens to stick around — we expressly do not).
 */
export async function startSalesforceToolOAuth(
  instanceUrl: string,
  context: SalesforceToolContext,
): Promise<string> {
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);

  sessionStorage.setItem(SESSION_KEY_VERIFIER, verifier);
  sessionStorage.setItem(SESSION_KEY_INSTANCE, instanceUrl);
  sessionStorage.setItem(SESSION_KEY_CONTEXT, JSON.stringify(context));

  const clientId = context.clientId?.trim() || SF_CLIENT_ID_DEFAULT;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: TOOL_CALLBACK_URL,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    // Request refresh token — essential because Poseidon refreshes
    // server-side using the sealed refresh_token; the device never
    // refreshes this binding again.
    scope: 'api refresh_token offline_access',
  });

  return `${instanceUrl}/services/oauth2/authorize?${params.toString()}`;
}

/**
 * Callback handler — trades the auth code for tokens, seals them
 * to the tool server's public key, and persists ONLY the sealed
 * envelope. Returns a summary the UI can show.
 *
 * Throws if any step fails. Errors are surfaced to the wizard's
 * error state rather than leaking plaintext anywhere.
 */
export async function completeSalesforceToolOAuth(code: string): Promise<{
  agentDisplayName: string;
  toolDisplayName: string;
  toolServerCodename: string;
}> {
  const verifier = sessionStorage.getItem(SESSION_KEY_VERIFIER);
  const loginUrl = sessionStorage.getItem(SESSION_KEY_INSTANCE);
  const contextRaw = sessionStorage.getItem(SESSION_KEY_CONTEXT);

  if (!verifier || !loginUrl || !contextRaw) {
    throw new Error('PKCE session data missing — please retry from the Tools page.');
  }

  const context: SalesforceToolContext = JSON.parse(contextRaw);
  const clientId = context.clientId?.trim() || SF_CLIENT_ID_DEFAULT;

  // Token exchange goes through the existing Ares proxy, same as the
  // Services flow. Ares returns the tokens in response headers; the
  // critical difference is what we do with them — seal immediately,
  // then wipe. Cookies set by Ares on this request are a known
  // Phase-0 leak (tracked as TODO below) that a follow-up PR removes
  // via an Ares endpoint that skips the Set-Cookie step.
  // TODO Phase 1: add `x-token-delivery: header-only-ephemeral` to
  // Ares that returns tokens in headers and sets no cookies.
  const response = await fetch(`${getGatewayUrl()}/v1/salesforce/auth/token`, {
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
      login_url: loginUrl,
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error_description || json.error || 'Token exchange failed');
  }

  // Tokens live in memory from here until the seal completes ~20ms later.
  const accessToken = response.headers.get('x-sf-access-token') || json.access_token;
  const refreshToken = response.headers.get('x-sf-refresh-token') || json.refresh_token;
  const instanceUrlResolved = json.instance_url || loginUrl;
  const tokenType = json.token_type;
  const issuedAt = json.issued_at;

  if (!accessToken || !instanceUrlResolved) {
    throw new Error('Token exchange returned no usable credentials.');
  }

  // Fetch the tool server's manifest + public key, then seal.
  // If the seal step throws, nothing persists — plaintext goes out
  // of scope when this function unwinds, and the GC reclaims it.
  //
  // NOTE: client_id rides in the sealed envelope alongside the tokens.
  // Poseidon uses it at refresh time to call /services/oauth2/token on
  // the user's behalf. Keeping it per-user (not a Poseidon-wide env
  // var) means each user can bring their own Connected App — the
  // Consumer Key never becomes shared state on our servers.
  const { sealedEnvelope, toolServerCodename } = await sealForToolServer(context.manifestUrl, {
    access_token: accessToken,
    refresh_token: refreshToken,
    instance_url: instanceUrlResolved,
    client_id: clientId,
    token_type: tokenType,
    issued_at: issuedAt,
    sealed_for: context.toolServerCodename,
  });

  // Sanity check: the manifest's codename should match what the
  // wizard was navigating to. If they differ, the user was routed
  // to a wrong server — bail rather than persist a binding that
  // Athena won't dispatch to.
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
    agentDisplayName: context.agentId, // caller can resolve to pretty name
    toolDisplayName: context.toolDisplayName,
    toolServerCodename: context.toolServerCodename,
  };
}

/** Abandon the in-flight flow (user hit Back in the wizard). */
export function cancelSalesforceToolOAuth(): void {
  wipeWizardStaging();
}

/**
 * Central cleanup for anything the wizard might have staged during the
 * OAuth ceremony. Called on successful completion AND on cancellation
 * so there's only one contract: "after a wizard session, localStorage
 * and sessionStorage hold nothing the wizard wrote."
 *
 * The pattern is prefix-scan + explicit-list, not a handwritten
 * per-key list — so future staging keys the wizard might add inherit
 * the cleanup without a code review catching an edge case. Anything
 * a wizard writes MUST use the `sf_tool_` prefix (or one of the
 * explicit legacy keys) so this sweep finds it.
 */
function wipeWizardStaging(): void {
  // sessionStorage — prefix sweep for anything the wizard staged,
  // plus the known triplet for defense in depth.
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith('sf_tool_')) sessionStorage.removeItem(k);
    }
    sessionStorage.removeItem(SESSION_KEY_VERIFIER);
    sessionStorage.removeItem(SESSION_KEY_INSTANCE);
    sessionStorage.removeItem(SESSION_KEY_CONTEXT);
  } catch {
    // non-fatal
  }

  // localStorage — no key the Tools flow owns should ever live here.
  // The earlier design mirrored clientId to `sf_client_id_override`
  // for cross-redirect persistence; that's now ridden through the
  // sessionStorage context blob instead, and this sweep wipes any
  // stale value from an older build or a user who visited /app/services.
  // Also wipes any plaintext SF credentials the legacy Services flow
  // might have persisted — belt and suspenders vs the module-level
  // scrubber in salesforce-client.ts.
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('sf_tool_') || k === 'sf_client_id_override') {
        localStorage.removeItem(k);
      }
    }
    localStorage.removeItem('sf_access_token');
    localStorage.removeItem('sf_refresh_token');
    localStorage.removeItem('sf_instance_url');
    localStorage.removeItem('sf_token_type');
    localStorage.removeItem('sf_issued_at');
  } catch {
    // non-fatal
  }
}
