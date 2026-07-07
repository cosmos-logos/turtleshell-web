// src/lib/sovereign-ai/secure-storage.ts
//
// EOS-5.4 Sovereign AI — Version 2 (no-plaintext-anywhere) at-rest storage.
//
// Steward directive 2026-07-07: BYOK keys are NEVER stored in plaintext on
// the client. Not localStorage, not sessionStorage, not IndexedDB in plain
// form. At paste time, the client seals the key against the target god's
// Ed25519 public key using crypto_box_seal. The resulting ciphertext is
// what lands in IndexedDB. The client CANNOT decrypt what it sealed —
// only the god's private key can.
//
// This module is the persistence adapter. It knows nothing about crypto;
// it only stores the byte blobs the sealer produced.
//
// ─── Storage shape ───
//
//   IndexedDB name:  turtleshell-sovereign-ai
//   Version:         1
//   Object store:    slots  (keyPath="key")
//
// Each slot record:
//   {
//     key:                 "chat:openai" | "voice:elevenlabs" | ...
//     category:            "chat" | "voice"
//     provider:            "openai" | "anthropic" | "grok" | "gemini" | "ollama" | "elevenlabs" | "xtts"
//     storedInner:         "<base64 sealed inner envelope from paste time>"
//     manifestFingerprint: "sha256:<hex of god manifest JSON at seal time>"
//     godRecipient:        "athena-616" | "apollo-616"  // manifest identity.codename
//     savedAt:             "2026-07-07T05:00:00.000Z"
//   }
//
// Slot invalidation (Steward's kill-switch):
//   • Chat rotation: server returns envelope_storage_stale → wipe chat:*.
//   • Voice rotation: same for voice:*.
//   • Manual delete: user hit the trash button in ProviderChooser.
//
// The client also proactively wipes when a save/load fingerprints out —
// see `wipeStaleAgainst(currentFingerprint, category)` — but the
// server-driven wipe path is the ultimate source of truth.

export type SovereignCategory = 'chat' | 'voice';

export interface StoredSlot {
  key: string;                    // "chat:openai" — synthetic composite key
  category: SovereignCategory;
  provider: string;
  storedInner: string;            // base64 sealed inner envelope
  manifestFingerprint: string;    // sha256:<hex>
  godRecipient: string;           // e.g. "athena-616"
  savedAt: string;                // ISO-8601 UTC
}

const DB_NAME = 'turtleshell-sovereign-ai';
const DB_VERSION = 1;
const STORE = 'slots';

// ─── Cached DB handle (opened once per session) ───

let cachedDb: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (cachedDb) return cachedDb;
  cachedDb = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        // keyPath="key" — the synthetic composite key is stored on each record
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
  return cachedDb;
}

function slotKey(category: SovereignCategory, provider: string): string {
  return `${category}:${provider}`;
}

// ─── Public API ───

/**
 * Persist a sealed inner envelope for a category+provider slot. Called by
 * the paste-time seal ceremony (ProviderChooser). Any pre-existing slot for
 * the same category+provider is overwritten atomically.
 *
 * The plaintext key ONLY exists inside the caller's memory long enough to
 * be sealed by crypto_box_seal. By the time this function is called, the
 * caller should already have zeroed / dropped the plaintext.
 */
export async function saveSlot(input: {
  category: SovereignCategory;
  provider: string;
  storedInner: string;
  manifestFingerprint: string;
  godRecipient: string;
}): Promise<void> {
  const db = await openDb();
  const record: StoredSlot = {
    key: slotKey(input.category, input.provider),
    category: input.category,
    provider: input.provider,
    storedInner: input.storedInner,
    manifestFingerprint: input.manifestFingerprint,
    godRecipient: input.godRecipient,
    savedAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('slot save failed'));
  });
}

/**
 * Load a slot by category+provider. Returns null when nothing is stored.
 * Used at send-time to pull the ciphertext to wrap in a fresh outer envelope,
 * and by ProviderChooser to know which slots are populated (for the "Saved"
 * fingerprint-only display).
 */
export async function loadSlot(
  category: SovereignCategory,
  provider: string,
): Promise<StoredSlot | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(slotKey(category, provider));
    req.onsuccess = () => resolve((req.result as StoredSlot | undefined) ?? null);
    req.onerror = () => reject(req.error || new Error('slot load failed'));
  });
}

/** Delete a single slot. Used by the trash-icon revoke path. */
export async function deleteSlot(
  category: SovereignCategory,
  provider: string,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(slotKey(category, provider));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('slot delete failed'));
  });
}

/**
 * List every slot in a category, in insertion order. Used by ProviderChooser
 * to render the fingerprint-only "Saved" state per provider row.
 */
export async function listSlots(
  category: SovereignCategory,
): Promise<StoredSlot[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result as StoredSlot[]) ?? [];
      resolve(all.filter((s) => s.category === category));
    };
    req.onerror = () => reject(req.error || new Error('slot list failed'));
  });
}

/**
 * Wipe every slot in a category (or all categories if omitted). Used by:
 *   • The server-returned envelope_storage_stale kill-switch (per category)
 *   • A hard "sign out and forget" flow (both categories)
 *
 * Returns the list of slots removed so the caller can tell the user what
 * they'll need to re-enter.
 */
export async function wipeAll(
  category?: SovereignCategory,
): Promise<StoredSlot[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result as StoredSlot[]) ?? [];
      const target = category ? all.filter((s) => s.category === category) : all;
      for (const slot of target) {
        store.delete(slot.key);
      }
      tx.oncomplete = () => resolve(target);
      tx.onerror = () => reject(tx.error || new Error('slot wipe failed'));
    };
    req.onerror = () => reject(req.error || new Error('slot list-for-wipe failed'));
  });
}

/**
 * Wipe slots whose stored manifest fingerprint no longer matches the
 * currently-fetched one — a proactive client-side check for god-key
 * rotation. Complements the reactive server-side envelope_storage_stale
 * error so users don't have to send a doomed chat turn to discover the
 * rotation happened.
 *
 * Returns the list of slots wiped so the UI can surface a one-time banner.
 */
export async function wipeStaleAgainst(
  currentFingerprint: string,
  category: SovereignCategory,
): Promise<StoredSlot[]> {
  const all = await listSlots(category);
  const stale = all.filter((s) => s.manifestFingerprint !== currentFingerprint);
  for (const s of stale) {
    await deleteSlot(category, s.provider);
  }
  return stale;
}

// ─── One-time legacy plaintext scrub ───

/**
 * Called once during app boot (see sovereign-ai-store hydration hook).
 * The v1 Zustand persist layer stored plaintext BYOK material under the
 * localStorage key `turtleshell-sovereign-ai`. Steward's 2026-07-07
 * directive is "no plaintext, ever" — so we DELETE the legacy blob on
 * first v2 load. Users will re-paste their keys with the ceremony flow.
 *
 * The pre-EOS-5.4 legacy key `turtleshell-user-api-keys` is also purged
 * for the same reason (its migration path landed plaintext into v1 slots).
 *
 * Idempotent — safe to call every boot.
 */
export function scrubLegacyPlaintextStorage(): { wipedKeys: string[] } {
  const wiped: string[] = [];
  const keys = ['turtleshell-sovereign-ai', 'turtleshell-user-api-keys'];
  for (const k of keys) {
    try {
      if (localStorage.getItem(k) !== null) {
        localStorage.removeItem(k);
        wiped.push(k);
      }
    } catch {
      // localStorage unavailable — nothing to do
    }
  }
  return { wipedKeys: wiped };
}
