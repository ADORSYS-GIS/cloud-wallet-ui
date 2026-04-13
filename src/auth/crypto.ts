/**
 * Low-level Web Crypto helpers for the self-issued JWT auth flow.
 *
 * Algorithm: ECDSA with P-256 curve, SHA-256 digest (ES256 in JOSE terms).
 * This is the standard algorithm for OID4VCI self-issued tokens and is
 * universally supported by browser SubtleCrypto implementations.
 */

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const ALGORITHM: EcKeyGenParams & EcdsaParams = {
  name: 'ECDSA',
  namedCurve: 'P-256',
  hash: 'SHA-256',
}

// ---------------------------------------------------------------------------
// Key generation & serialisation
// ---------------------------------------------------------------------------

export type ExportedKeyPair = {
  publicKeyJwk: JsonWebKey
  privateKeyJwk: JsonWebKey
}

/**
 * Generate a fresh ECDSA P-256 key pair and export both keys as JWK objects.
 * The private key is marked non-extractable after import (only exportable here
 * at generation time so we can persist it to localStorage).
 */
export async function generateKeyPair(): Promise<ExportedKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true, // extractable — we need to export to JWK for persistence
    ['sign', 'verify']
  )

  const [publicKeyJwk, privateKeyJwk] = await Promise.all([
    crypto.subtle.exportKey('jwk', keyPair.publicKey),
    crypto.subtle.exportKey('jwk', keyPair.privateKey),
  ])

  return { publicKeyJwk, privateKeyJwk }
}

/**
 * Import a previously exported private-key JWK back into a CryptoKey.
 */
export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, // not extractable after import
    ['sign']
  )
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

/**
 * Base64url-encode a Uint8Array (no padding, URL-safe alphabet).
 */
function base64url(bytes: ArrayBuffer): string {
  const uint8 = new Uint8Array(bytes)
  let binary = ''
  for (const byte of uint8) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Base64url-encode a plain JS object serialised to JSON.
 */
function base64urlJson(obj: unknown): string {
  const json = JSON.stringify(obj)
  const bytes = new TextEncoder().encode(json)
  return base64url(bytes)
}

// ---------------------------------------------------------------------------
// JWT creation
// ---------------------------------------------------------------------------

/**
 * The JOSE header embedded in every self-issued JWT.
 *
 * `jwk` carries the public key so the backend can verify the signature
 * without a prior key-registration step, as required by the spec:
 * "The corresponding public key JWK MUST be included in the token header
 *  or body so the backend can verify the signature."
 */
type JwtHeader = {
  alg: 'ES256'
  typ: 'JWT'
  jwk: JsonWebKey
}

/**
 * The JWT claims set.
 */
type JwtPayload = {
  sub: string // tenant_id
  iat: number // issued-at (Unix epoch seconds)
  exp: number // expiry   (Unix epoch seconds)
}

/**
 * Create and sign a self-issued JWT Bearer token.
 *
 * @param tenantId   The UUID returned by POST /tenants — used as `sub`.
 * @param privateKey The CryptoKey to sign with.
 * @param publicKeyJwk The matching public key JWK embedded in the header.
 * @param ttlSeconds Token lifetime in seconds (default: 300 = 5 minutes).
 */
export async function createBearerToken(
  tenantId: string,
  privateKey: CryptoKey,
  publicKeyJwk: JsonWebKey,
  ttlSeconds = 300
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const header: JwtHeader = {
    alg: 'ES256',
    typ: 'JWT',
    jwk: publicKeyJwk,
  }

  const payload: JwtPayload = {
    sub: tenantId,
    iat: now,
    exp: now + ttlSeconds,
  }

  const headerB64 = base64urlJson(header)
  const payloadB64 = base64urlJson(payload)
  const signingInput = `${headerB64}.${payloadB64}`

  const signingInputBytes = new TextEncoder().encode(signingInput)

  const signatureBuffer = await crypto.subtle.sign(
    ALGORITHM,
    privateKey,
    signingInputBytes
  )

  const signatureB64 = base64url(signatureBuffer)

  return `${signingInput}.${signatureB64}`
}