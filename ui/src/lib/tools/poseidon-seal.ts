// ui/src/lib/tools/poseidon-seal.ts
//
// Client-side sealing for the per-agent tool-binding flow.
//
// Contract (read this before touching anything):
//   - We never persist tool credentials (SF access_token, refresh_token,
//     instance_url, etc.) in plaintext. Not in localStorage. Not in
//     sessionStorage. Not in IndexedDB. Not in httpOnly cookies. Not
//     anywhere we or any CloudPremise server can read them at rest.
//   - The browser holds plaintext ONLY in the milliseconds between the
//     OAuth code exchange returning and this seal helper completing.
//     After `sealToolCredentials` returns, the caller MUST discard its
//     plaintext references. If you add a path that keeps plaintext
//     around, you're breaking the thesis and also the demo.
//   - The ciphertext can be persisted anywhere (localStorage, Salesforce
//     ProfileData, a sticky note) because only Poseidon (the holder of
//     the matching Ed25519 private key) can unseal. This is the LastPass
//     model: ciphertext everywhere, key only with the gatekeeper.
//
// The caller resolves which tool server to seal against by looking up
// the agent's `trusted_tool_servers[i].manifest_url`, fetching that
// manifest, and passing its `cryptography.public_key` here.

import sodium from 'libsodium-wrappers-sumo';

/** Decode a PEM-encoded Ed25519 public key and return the raw 32-byte key. */
function decodeEd25519PublicKeyPem(pem: string): Uint8Array {
  // Strip PEM headers + whitespace → base64 → DER → last 32 bytes (OID prefix is 12 bytes).
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  // OID + BIT STRING header is 12 bytes for Ed25519 SubjectPublicKeyInfo.
  // Falling back to last 32 bytes handles both strict SPKI (44 bytes total)
  // and the rare case of a raw 32-byte key in a PEM wrapper.
  return der.length === 44 ? der.slice(12) : der.slice(-32);
}

/**
 * Fetch the tool server's cosmos-logos manifest and extract the
 * cryptography.public_key. Done once per seal (tiny payload, <5KB)
 * so that rotating the key on Poseidon takes effect immediately
 * — no stale keys cached client-side.
 */
export async function fetchToolServerPublicKey(manifestUrl: string): Promise<{
  manifest: {
    identity: { codename: string; name: string };
    cryptography: { public_key: string; algorithm: string };
  };
  ed25519Pk: Uint8Array;
  x25519Pk: Uint8Array;
}> {
  const res = await fetch(manifestUrl, { credentials: 'omit' });
  if (!res.ok) {
    throw new Error(`Failed to fetch tool server manifest (${res.status}) from ${manifestUrl}`);
  }
  const manifest = await res.json();
  const pem = manifest?.cryptography?.public_key;
  if (!pem || typeof pem !== 'string') {
    throw new Error('Tool server manifest is missing cryptography.public_key');
  }
  await sodium.ready;

  const ed25519Pk = decodeEd25519PublicKeyPem(pem);
  // X25519 is what crypto_box_seal needs. Ed25519 → X25519 is a
  // deterministic derivation so every client + server reaches the
  // same X25519 key without exchanging anything new.
  const x25519Pk = sodium.crypto_sign_ed25519_pk_to_curve25519(ed25519Pk);
  return { manifest, ed25519Pk, x25519Pk };
}

export interface SalesforceToolCredentials {
  /** Current SF access token (Bearer). */
  access_token: string;
  /** Refresh token — required because refresh happens server-side
   *  in Poseidon; the device throws away its copy after sealing. */
  refresh_token?: string;
  /** The user's own org instance URL (e.g. https://mycompany.my.salesforce.com). */
  instance_url: string;
  /** Optional: SF's `issued_at` timestamp for debugging/observability. */
  issued_at?: string;
  /** Optional: SF `token_type` (typically "Bearer"). */
  token_type?: string;
}

/**
 * Seal a credentials bundle to the tool server's public key.
 * Caller MUST zero/drop plaintext immediately after this resolves.
 * Returns a base64-encoded sealed box, ready to persist.
 */
export async function sealToolCredentials(
  x25519Pk: Uint8Array,
  credentials: Record<string, unknown>,
): Promise<string> {
  await sodium.ready;
  const plaintext = sodium.from_string(JSON.stringify(credentials));
  const sealed = sodium.crypto_box_seal(plaintext, x25519Pk);
  // libsodium from_string returns a Uint8Array — we don't have a
  // reliable way to scrub its memory in JS, but we can at least
  // null our reference so the GC can reclaim it sooner.
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}

/**
 * High-level helper: fetch the tool server's key and seal credentials
 * in one call. Use this from OAuth callbacks.
 */
export async function sealForToolServer(
  manifestUrl: string,
  credentials: Record<string, unknown>,
): Promise<{ sealedEnvelope: string; toolServerCodename: string }> {
  const { manifest, x25519Pk } = await fetchToolServerPublicKey(manifestUrl);
  const sealedEnvelope = await sealToolCredentials(x25519Pk, credentials);
  return { sealedEnvelope, toolServerCodename: manifest.identity.codename };
}
