/**
 * Cryptographic helpers for self-issued JWT authentication.
 *
 * Uses the Web Crypto API (SubtleCrypto) to generate an ECDSA P-256 key pair,
 * export the public key as a JWK, and sign compact JWTs.
 *
 * Key-pair lifecycle:
 * - Generated once on first use via `getOrCreateKeyPair()`.
 * - Persisted in `localStorage` as exported JWK strings so the same identity
 *   survives page reloads without re-registration.
 * - On import failure the corrupted keys are discarded and a fresh pair is created.
 */

export type JwkPublicKey = JsonWebKey & { kty: string }

export type StoredKeyPair = {
  privateKeyJwk: JsonWebKey
  publicKeyJwk: JwkPublicKey
}

const STORAGE_KEY = 'cloud_wallet_keypair'

async function generateKeyPair(): Promise<StoredKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true, // extractable
    ['sign', 'verify']
  )

  const [privateKeyJwk, publicKeyJwk] = await Promise.all([
    crypto.subtle.exportKey('jwk', keyPair.privateKey),
    crypto.subtle.exportKey('jwk', keyPair.publicKey),
  ])

  return {
    privateKeyJwk,
    publicKeyJwk: publicKeyJwk as JwkPublicKey,
  }
}

async function loadStoredKeyPair(): Promise<StoredKeyPair | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredKeyPair

    // Verify both keys are importable before trusting them.
    await Promise.all([
      crypto.subtle.importKey(
        'jwk',
        stored.privateKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      ),
      crypto.subtle.importKey(
        'jwk',
        stored.publicKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      ),
    ])

    return stored
  } catch {
    // Corrupted or incompatible — discard and regenerate.
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

/**
 * Returns the persisted key pair or generates (and persists) a new one.
 */
export async function getOrCreateKeyPair(): Promise<StoredKeyPair> {
  const existing = await loadStoredKeyPair()
  if (existing) return existing

  const fresh = await generateKeyPair()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
  return fresh
}

function base64urlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function encodeJson(obj: unknown): string {
  return base64urlEncode(new TextEncoder().encode(JSON.stringify(obj)))
}

/**
 * Creates a signed compact JWT (ES256) with the spec-required claims:
 *   - `sub`: tenant_id
 *   - `iat`: current Unix timestamp
 *   - `exp`: iat + ttlSeconds (default: 1 hour)
 *
 * The public key JWK is embedded in the JWT header under `jwk` so the backend
 * can verify the signature without a separate key-lookup step.
 */
export async function createJwt(
  tenantId: string,
  keyPair: StoredKeyPair,
  ttlSeconds = 3600
): Promise<string> {
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    keyPair.privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + ttlSeconds

  const header = {
    alg: 'ES256',
    typ: 'JWT',
    jwk: keyPair.publicKeyJwk,
  }

  const payload = {
    sub: tenantId,
    iat,
    exp,
  }

  const signingInput = `${encodeJson(header)}.${encodeJson(payload)}`
  const signingBytes = new TextEncoder().encode(signingInput)

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    signingBytes
  )

  return `${signingInput}.${base64urlEncode(signatureBuffer)}`
}
