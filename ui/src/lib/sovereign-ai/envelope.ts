// src/lib/sovereign-ai/envelope.ts
//
// EOS-5.4 Sovereign AI — BYOK sealed envelope for turtleshell-web.
//
// Structural mirror of omens' Omens.Integration.CosmosLogos.SovereignEnvelopeSealer
// and athena's src/ai/sovereign-envelope.ts (decrypt side).
// The wire contract is defined by
// olympus-616/docs/sovereign-ai-seam-cross-surface-reference.md §3.
//
// The plaintext payload sealed against the recipient god's Ed25519 pubkey is:
//   {
//     byok: { provider, key|null, endpoint|null, model|null },
//     nonce:               <hex 16 bytes>,
//     issuedAt:            <ISO-8601 UTC>,
//     clientSurface:       "turtleshell-web",
//     manifestFingerprint: "sha256:<hex>"     // SHA-256 of the manifest JSON at seal time
//   }
//
// The outer wire block (unsealed, attached to the /chat body) is:
//   {
//     sovereignAI: {
//       chatProvider:     "openai" | "anthropic" | "grok" | "gemini" | "ollama",
//       sealedEnvelope:   "<base64>",
//       envelopeFormat:   "libsodium",
//       envelopeVersion:  "cosmos-logos-sealed-v1",
//       manifestUrl:      "<athena manifest url>"
//     }
//   }

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
  provider: string;             // openai / anthropic / grok / gemini / ollama / elevenlabs / xtts
  key: string | null;
  endpoint: string | null;
  model: string | null;
}

/** Return shape for a sealed envelope — attached to the wire body verbatim. */
export interface SealedSovereignEnvelope {
  sealedEnvelopeBase64: string;
  envelopeFormat: 'libsodium';
  envelopeVersion: 'cosmos-logos-sealed-v1';
  manifestUrl: string;
  manifestFingerprint: string;
}

/** SHA-256 hex digest — small helper for the manifest fingerprint field. */
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

/**
 * Fetch the recipient god's cosmos-logos manifest, seal the BYOK payload
 * against its Ed25519 pubkey, and return the wire-ready envelope block.
 *
 * The plaintext key exists in browser memory ONLY between the caller
 * invoking this function and the sealed bytes being handed back. Never
 * persisted (localStorage per-provider slot storage handles at-rest);
 * never logged. After crossing the wire only the sealed ciphertext exists;
 * only the target god's private key decrypts it.
 */
export async function sealSovereignAiEnvelope(
  manifestUrl: string,
  byok: SovereignBYOKPayload,
  clientSurface: string,
): Promise<SealedSovereignEnvelope> {
  // 1. Fetch manifest — no-cache so pubkey rotations flow through same session
  const manifestResp = await fetch(manifestUrl, { cache: 'no-cache' });
  if (!manifestResp.ok) {
    throw new Error(`Manifest fetch failed: HTTP ${manifestResp.status}`);
  }
  const manifestJson = await manifestResp.json();
  const recipientPem: string | undefined = manifestJson?.cryptography?.public_key;
  if (!recipientPem) {
    throw new Error('Manifest missing cryptography.public_key');
  }

  // 2. Manifest fingerprint — SHA-256 of the manifest JSON as returned.
  //    (Server may generate the pubkey dynamically per-request per the seam
  //    doc §5.2; the fingerprint locks the client to the exact bytes it
  //    saw, so a mid-flight substitution is detectable during audit.)
  const rawManifestText = JSON.stringify(manifestJson);
  const fingerprint = 'sha256:' + (await sha256Hex(rawManifestText));

  // 3. Build the plaintext payload — this is what gets sealed.
  const payload = {
    byok: {
      provider: byok.provider,
      key: byok.key,
      endpoint: byok.endpoint,
      model: byok.model,
    },
    nonce: randomNonceHex(),
    issuedAt: new Date().toISOString(),
    clientSurface,
    manifestFingerprint: fingerprint,
  };

  // 4. Seal via libsodium crypto_box_seal against the recipient's X25519
  //    pubkey (converted from Ed25519). Anti-tamper: the sealed box uses
  //    an ephemeral keypair so even the sender cannot decrypt after seal.
  const sealed = await sealToken(JSON.stringify(payload), recipientPem);

  return {
    sealedEnvelopeBase64: sealed,
    envelopeFormat: 'libsodium',
    envelopeVersion: 'cosmos-logos-sealed-v1',
    manifestUrl,
    manifestFingerprint: fingerprint,
  };
}
