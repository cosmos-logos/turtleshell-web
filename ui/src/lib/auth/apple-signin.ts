// lib/auth/apple-signin.ts
//
// Thin, type-safe wrapper around Apple's Sign in with Apple JS SDK.
// Loaded on demand (we don't ship Apple's JS in the main bundle — most
// users never click the button).
//
// Apple is strict about Services ID + domain configuration:
//   • Services ID         : ai.turtleshell.signin-web
//   • Primary App ID      : B49L273ED5.ai.turtleshell.TurtleShell-ai
//   • Registered domains  : turtleshell.ai (any *.turtleshell.ai subdomain
//                           must be added explicitly in the Apple console)
//   • Return URL          : https://turtleshell.ai/auth/apple/callback
//
// Apple rejects the popup outright if the Origin doesn't match a
// registered domain (no localhost, no ngrok, no preview URLs unless they
// also happen to be on a registered subdomain). `isAppleSignInSupported()`
// gates the button render so devs on localhost see a friendlier no-op
// instead of a runtime error.
//

const APPLE_SDK_SRC =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

const APPLE_CLIENT_ID = 'ai.turtleshell.signin-web';
const APPLE_REDIRECT_URI = 'https://turtleshell.ai/auth/apple/callback';
const APPLE_SCOPE = 'name email';

/// Domains where Apple SIWA is registered. Origin must match one of these
/// for the popup to succeed at runtime. Add subdomains here when you
/// register them in the Apple console.
const REGISTERED_HOSTS = new Set([
  'turtleshell.ai',
  'www.turtleshell.ai',
  // 'app.turtleshell.ai',         // uncomment after registering
  // 'staging.turtleshell.ai',
]);

// Apple's global typing — they don't ship type defs.
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state?: string;
          nonce?: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            code: string;
            id_token: string;
            state?: string;
          };
          user?: {
            email?: string;
            name?: { firstName?: string; lastName?: string };
          };
        }>;
      };
    };
  }
}

let sdkLoadPromise: Promise<void> | null = null;
let initialized = false;

/**
 * Lazy-load Apple's JS SDK. Subsequent calls return the same promise —
 * the script tag is only added once.
 */
function loadAppleSDK(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    if (window.AppleID) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = APPLE_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Apple SDK'));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

/**
 * True if the current host is on Apple's registered-domain list. Used
 * to gate the button — on localhost / preview URLs we hide it (or show
 * a "not available in this environment" tooltip) instead of letting the
 * popup fail at runtime.
 */
export function isAppleSignInSupported(): boolean {
  // SSR safety
  if (typeof window === 'undefined') return false;
  return REGISTERED_HOSTS.has(window.location.hostname);
}

export interface AppleSignInResult {
  /** Apple's signed JWT — pass straight to Ares /v1/auth/apple/identity/verify */
  identityToken: string;
  /** First-sign-in only: Apple shares the user's email + name once. */
  user?: {
    email?: string;
    name?: { firstName?: string; lastName?: string };
  };
}

/**
 * Trigger the Apple SIWA popup. Resolves with the identity token + first-
 * sign-in user info. Caller is responsible for forwarding the identity
 * token to the Olympus-Grid backend.
 *
 * Throws if the popup is blocked, the user cancels, or the SDK fails to
 * load. Caller should surface the error to the UI.
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  await loadAppleSDK();
  if (!window.AppleID) {
    throw new Error('Apple SDK loaded but global AppleID object missing');
  }

  if (!initialized) {
    window.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      scope: APPLE_SCOPE,
      redirectURI: APPLE_REDIRECT_URI,
      // We use popup mode so the user stays on our page — the redirectURI
      // still has to be registered with Apple, but the page is never
      // actually navigated to in popup mode.
      usePopup: true,
    });
    initialized = true;
  }

  const result = await window.AppleID.auth.signIn();
  return {
    identityToken: result.authorization.id_token,
    user: result.user,
  };
}
