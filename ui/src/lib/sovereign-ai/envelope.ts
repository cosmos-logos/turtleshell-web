// src/lib/sovereign-ai/envelope.ts
//
// EOS-5.4 Sovereign AI — BYOK sealed envelopes for turtleshell-web.
//
// Structural mirror of omens' Omens.Integration.CosmosLogos.SovereignEnvelopeSealer
// and athena/api/src/ai/sovereign-envelope.ts (decrypt side).
// The wire contract is defined by
// olympus-616/docs/sovereign-ai-seam-cross-surface-reference.md §3.
//
// ─── Version 2 (post-2026-07-07 Steward directive) ─────────────────────
//
// This module now exposes TWO seal primitives, one for each moment BYOK
// material crosses a boundary:
//
//   1. sealForStorage(manifestUrl, byok)
//        Called ONCE at paste-time. Fetches the god's manifest, seals the
//        raw BYOK material against the god's Ed25519 pubkey, returns the
//        ciphertext + manifest fingerprint. The client CANNOT decrypt what
//        it sealed — only the god's private key can. Store this ciphertext
//        in IndexedDB (via secure-storage.ts). This is the "no plaintext
//        anywhere" primitive.
//
//   2. sealForWire(manifestUrl, storedInner, clientSurface)
//        Called at EVERY /chat and /speak turn. Fetches the manifest again
//        (to get the current pubkey + fingerprint), wraps the stored inner
//        ciphertext inside a fresh outer envelope carrying nonce + issuedAt
//        for anti-replay, seals that outer against the god's current pubkey,
//        returns the wire-ready block. If the god's private key has rotated
//        since the storage seal, the server will fail the inner decrypt
//        with envelope_storage_stale — the client wipes the slot and prompts
//        re-entry (Steward's rotation-kill-switch property).
//
// The old sealSovereignAiEnvelope function is INTENTIONALLY REMOVED. The
// only correct call sites now are:
//   Save flow → sealForStorage → secure-storage.saveSlot
//   Send flow → secure-storage.loadSlot → sealForWire → attach to body
//
// If you're tempted to seal fresh BYOK on every request, that means you
// still have plaintext material in memory outside of the paste flow —
// which violates the "never plaintext at rest" property.

import { sealToken } from '@/lib/cosmos-logos/crypto';

/** Providers accepted by Athena's chat sovereign envelope (chat god). */
export type SovereignChatProvider =
  | 'olympus-grid'
  | 'openai'
  | 'anthropic'
  | 'grok'
  | 'gemini'
  | 'ollama';

/** Providers accepted by Apollo's voice sovereign envelope (voice god). */
export type SovereignVoiceProvider =
  | 'olympus-grid'
  | 'openai'
  | 'elevenlabs'
  | 'xtts';

/** BYOK payload the caller wants sealed. Fields the SaaS providers don't
 *  use (endpoint for openai/anthropic/grok/gemini/elevenlabs) should be null,
 *  not empty strings — the server-side decrypt distinguishes null (absent)
 *  from empty (present but blank) when inferring endpointClass. */
export interface SovereignBYOKPayload {
  provider: string;
  key: string | null;
  endpoint: string | null;
  model: string | null;
}

/** Return shape from sealForStorage — the ciphertext + provenance the
 *  caller writes into IndexedDB. */
export interface StorageSealResult {
  /** Base64 sealed inner envelope. Only the god's private key can decrypt. */
  storedInner: string;
  /** SHA-256 of the manifest JSON at seal time. Locks the slot to the
   *  god pubkey the client verified. */
  manifestFingerprint: string;
  /** v3 storage key (Steward 2026-07-09) — SHA-256 hex of the RAW 32-byte
   *  Ed25519 pubkey. This is the stable cryptographic identity of the
   *  target god. Same key across clusters/reformattings → same fingerprint
   *  → same sovereign slot. Different pubkey (same codename or not) →
   *  different slot. This is what makes agent-scoped sovereign storage
   *  work: two Athenas with the same name but different keypairs live in
   *  cryptographically distinct silos. */
  pubkeyFingerprint: string;
  /** God's identity.codename from the manifest — used for provenance and
   *  as a soft check when we wipe on rotation. */
  godRecipient: string;
}

/** Return shape from sealForWire — the wire block that lands verbatim in
 *  the sovereignAI field of the outbound /chat or /speak request body. */
export interface SealedSovereignEnvelope {
  sealedEnvelopeBase64: string;
  envelopeFormat: 'libsodium';
  envelopeVersion: 'cosmos-logos-sealed-v2';
  manifestUrl: string;
  manifestFingerprint: string;
}

// ─── Small helpers ───

/** SHA-256 hex digest — used for the manifest fingerprint field. */
async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Cryptographically random 16-byte nonce, hex-encoded. */
function randomNonceHex(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Extract the raw base64 body from an Ed25519 PEM. Kept lenient about
 *  whitespace / different header labels — `-----BEGIN PUBLIC KEY-----`
 *  is standard but Ed25519 tools sometimes emit `-----BEGIN Ed25519 PUBLIC KEY-----`. */
function pemBodyBase64(pem: string): string {
  return pem
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s/g, '')
    .trim();
}

/** SHA-256 of the RAW PUBLIC KEY bytes (not the PEM string). This is the
 *  stable cryptographic identity of the target god — same key across
 *  clusters or reformattings produces the same fingerprint. Used to key
 *  sovereign-storage slots so a saved BYOK travels with the trust anchor
 *  it was sealed against.
 *
 *  v3 (agent-scoped sovereign storage, Steward 2026-07-09): this fingerprint
 *  is what makes two agents with the same codename but different keypairs
 *  cryptographically distinct sovereign silos, and what makes the same
 *  agent reached via two clusters share a single silo. */
export async function computePubkeyFingerprint(pemPubkey: string): Promise<string> {
  const b64 = pemBodyBase64(pemPubkey);
  // Decode base64 → raw DER bytes → take the last 32 bytes (Ed25519 SPKI
  // wraps the 32-byte key in a small SubjectPublicKeyInfo prefix; taking
  // the tail matches Athena's server-side heuristic).
  const binary = atob(b64);
  const raw = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i);
  const tail = raw.slice(-32);
  const hashed = await crypto.subtle.digest('SHA-256', tail);
  return Array.from(new Uint8Array(hashed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Fetch + parse a cosmos-logos manifest, returning the raw JSON text
 *  (for fingerprint hashing) + parsed manifest + extracted PEM pubkey +
 *  pubkey fingerprint (v3 storage key). */
async function fetchManifest(manifestUrl: string): Promise<{
  rawText: string;
  parsed: any;
  pemPubkey: string;
  fingerprint: string;
  pubkeyFingerprint: string;
  godRecipient: string;
}> {
  const resp = await fetch(manifestUrl, { cache: 'no-cache' });
  if (!resp.ok) {
    throw new Error(`Manifest fetch failed: HTTP ${resp.status}`);
  }
  const parsed = await resp.json();
  const pemPubkey: string | undefined = parsed?.cryptography?.public_key;
  if (!pemPubkey) {
    throw new Error('Manifest missing cryptography.public_key');
  }
  const godRecipient: string = parsed?.identity?.codename || 'unknown';
  const pubkeyFingerprint = await computePubkeyFingerprint(pemPubkey);
  // Fingerprint hashes the JSON.stringify of the PARSED manifest so a
  // reformat-in-transit doesn't spuriously invalidate. The property that
  // matters — same pubkey ⇒ same fingerprint — holds either way as long as
  // both sides serialize consistently. Server currently uses the raw body,
  // which for our returns is the same thing at the byte level today.
  const rawText = JSON.stringify(parsed);
  const fingerprint = 'sha256:' + (await sha256Hex(rawText));
  return { rawText, parsed, pemPubkey, fingerprint, pubkeyFingerprint, godRecipient };
}

// ─── sealForStorage — paste-time ───

/**
 * Seal a raw BYOK payload against the god's public key for at-rest storage.
 * Called ONCE from the ProviderChooser paste ceremony.
 *
 * The plaintext key exists in caller memory only for the duration of this
 * function's execution. Immediately after this returns, the caller should
 * write the `storedInner` to IndexedDB and forget the plaintext.
 *
 * Because crypto_box_seal uses an ephemeral sender keypair, the client can
 * NEVER decrypt what it just sealed — only the god's private key can. This
 * is the load-bearing property that makes v2 storage safe: even under XSS,
 * the raw provider key cannot be extracted from the ciphertext.
 */
export async function sealForStorage(
  manifestUrl: string,
  byok: SovereignBYOKPayload,
): Promise<StorageSealResult> {
  const { pemPubkey, fingerprint, pubkeyFingerprint, godRecipient } = await fetchManifest(manifestUrl);

  // The inner payload is intentionally minimal — no timestamp, no client
  // surface, no fingerprint. Anti-replay lives on the outer wire envelope
  // (see sealForWire below); mixing timestamps into the inner would make
  // the storage record expire after 5 minutes, which is exactly the bug
  // the storage/wire split is here to avoid.
  const innerPayload = {
    byok: {
      provider: byok.provider,
      key: byok.key,
      endpoint: byok.endpoint,
      model: byok.model,
    },
  };

  const storedInner = await sealToken(JSON.stringify(innerPayload), pemPubkey);

  return {
    storedInner,
    manifestFingerprint: fingerprint,
    pubkeyFingerprint,
    godRecipient,
  };
}

// ─── sealForWire — send-time ───

/**
 * Wrap a previously-stored inner ciphertext inside a fresh outer envelope
 * for the current /chat or /speak turn. Called from the chat client + audio
 * manager, once per outbound request.
 *
 * The outer envelope carries anti-replay (`nonce` + `issuedAt`) and the
 * current manifest fingerprint. Server decrypts outer, checks timestamps,
 * then decrypts the inner. If the inner fails to decrypt (god private key
 * rotated since the storedInner was sealed), the server returns
 * envelope_storage_stale and the caller wipes the slot.
 */
export async function sealForWire(
  manifestUrl: string,
  storedInner: string,
  clientSurface: string,
): Promise<SealedSovereignEnvelope> {
  const { pemPubkey, fingerprint } = await fetchManifest(manifestUrl);

  const outerPayload = {
    // The still-sealed inner ciphertext from IndexedDB — passed through
    // verbatim. Server decrypts THIS with the god private key to recover
    // the byok material.
    storedInner,
    nonce: randomNonceHex(),
    issuedAt: new Date().toISOString(),
    clientSurface,
    manifestFingerprint: fingerprint,
  };

  const sealed = await sealToken(JSON.stringify(outerPayload), pemPubkey);

  return {
    sealedEnvelopeBase64: sealed,
    envelopeFormat: 'libsodium',
    envelopeVersion: 'cosmos-logos-sealed-v2',
    manifestUrl,
    manifestFingerprint: fingerprint,
  };
}

// ─── Manifest exposure — used by the paste ceremony to show provenance ───

/**
 * Small helper exposed so the ProviderChooser ceremony UI can render the
 * god identity + fingerprint alongside the seal step. Kept separate from
 * the two seal primitives so the ceremony renderer doesn't have to know
 * anything about sealing.
 */
export async function fetchManifestForCeremony(manifestUrl: string): Promise<{
  pemPubkey: string;
  fingerprint: string;
  /** v3 storage-key fingerprint. See envelope.computePubkeyFingerprint. */
  pubkeyFingerprint: string;
  godRecipient: string;
  identity: { codename: string; name?: string };
}> {
  const { parsed, pemPubkey, fingerprint, pubkeyFingerprint, godRecipient } = await fetchManifest(manifestUrl);
  return {
    pemPubkey,
    fingerprint,
    pubkeyFingerprint,
    godRecipient,
    identity: {
      codename: godRecipient,
      name: parsed?.identity?.name,
    },
  };
}
