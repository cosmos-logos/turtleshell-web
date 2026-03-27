import _sodium from 'libsodium-wrappers-sumo'

let sodiumReady = false

async function ensureSodium() {
  if (!sodiumReady) {
    await _sodium.ready
    sodiumReady = true
  }
  return _sodium
}

const LS_KEY_PUBLIC = 'turtleshell-cosmos-ed25519-pub'
const LS_KEY_PRIVATE = 'turtleshell-cosmos-ed25519-priv'

/**
 * Load or generate TurtleShell's Ed25519 keypair.
 * Stored in localStorage. Persists across sessions.
 */
export async function loadOrGenerateKeypair(): Promise<{
  publicKey: Uint8Array
  privateKey: Uint8Array
  publicKeyBase64: string
}> {
  const sodium = await ensureSodium()

  const storedPub = localStorage.getItem(LS_KEY_PUBLIC)
  const storedPriv = localStorage.getItem(LS_KEY_PRIVATE)

  if (storedPub && storedPriv) {
    const publicKey = sodium.from_base64(storedPub)
    const privateKey = sodium.from_base64(storedPriv)
    return { publicKey, privateKey, publicKeyBase64: storedPub }
  }

  // Generate new keypair
  const keypair = sodium.crypto_sign_keypair()
  const pubB64 = sodium.to_base64(keypair.publicKey)
  const privB64 = sodium.to_base64(keypair.privateKey)

  localStorage.setItem(LS_KEY_PUBLIC, pubB64)
  localStorage.setItem(LS_KEY_PRIVATE, privB64)

  console.log('[cosmos-logos] Generated TurtleShell Ed25519 keypair')
  console.log('[cosmos-logos] Public key (base64):', pubB64)

  return {
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
    publicKeyBase64: pubB64,
  }
}

/**
 * Get TurtleShell's public key in PEM format for trust registration.
 */
export async function getPublicKeyPem(): Promise<string> {
  const { publicKeyBase64 } = await loadOrGenerateKeypair()
  return `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`
}

/**
 * Parse a PEM-encoded Ed25519 public key to raw bytes.
 */
function pemToBytes(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s/g, '')
  // Use standard atob — more forgiving than libsodium's base64 decoder
  const binary = atob(b64)
  const der = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) der[i] = binary.charCodeAt(i)
  // PEM contains DER-encoded SPKI. For Ed25519, the raw key is the last 32 bytes.
  // Ed25519 SPKI is 44 bytes: 12-byte header + 32-byte key
  return der.slice(der.length - 32)
}

/**
 * Encrypt a token using a sealed box addressed to the recipient's Ed25519 public key.
 * Ed25519 -> Curve25519 conversion + crypto_box_seal.
 */
export async function sealToken(token: string, recipientEd25519Pem: string): Promise<string> {
  const sodium = await ensureSodium()
  const ed25519Pub = pemToBytes(recipientEd25519Pem)
  // Convert Ed25519 public key to Curve25519 (X25519) for encryption
  const curve25519Pub = sodium.crypto_sign_ed25519_pk_to_curve25519(ed25519Pub)
  // Seal the token
  const tokenBytes = sodium.from_string(token)
  const sealed = sodium.crypto_box_seal(tokenBytes, curve25519Pub)
  return sodium.to_base64(sealed, sodium.base64_variants.URLSAFE_NO_PADDING)
}

/**
 * Sign a request: Ed25519 detached signature over (timestamp + body).
 */
export async function signRequest(
  body: string,
  privateKey: Uint8Array,
): Promise<{ signature: string; timestamp: string }> {
  const sodium = await ensureSodium()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const message = sodium.from_string(timestamp + body)
  const signature = sodium.crypto_sign_detached(message, privateKey)
  return {
    signature: sodium.to_base64(signature, sodium.base64_variants.URLSAFE_NO_PADDING),
    timestamp,
  }
}

/**
 * Build auth headers for an authenticated request to a cosmos-logos agent.
 * Header names are read from the agent's manifest (never hardcoded).
 */
export async function buildAuthHeaders(
  manifest: { cryptography: { signing_header: string; timestamp_header: string }; envelope?: { header: string } },
  body: string,
  privateKey: Uint8Array,
  sealedToken: string,
): Promise<Record<string, string>> {
  const { signature, timestamp } = await signRequest(body, privateKey)
  const headers: Record<string, string> = {
    [manifest.cryptography.signing_header]: signature,
    [manifest.cryptography.timestamp_header]: timestamp,
  }
  if (manifest.envelope?.header) {
    headers[manifest.envelope.header] = sealedToken
  }
  return headers
}
