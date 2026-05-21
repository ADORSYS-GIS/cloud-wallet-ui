import { generateKeyPair, exportJWK, importJWK, SignJWT } from 'jose'

export type JwkPublicKey = JsonWebKey & { kty: string }

export type StoredKeyPair = {
  privateKeyJwk: JsonWebKey
  publicKeyJwk: JwkPublicKey
}

const STORAGE_KEY = 'bearer_token_keypair'

async function generateAndExportKeyPair(): Promise<StoredKeyPair> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', {
    extractable: true,
  })

  const [privateKeyJwk, publicKeyJwk] = await Promise.all([
    exportJWK(privateKey),
    exportJWK(publicKey),
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
      importJWK(stored.privateKeyJwk, 'ES256'),
      importJWK(stored.publicKeyJwk, 'ES256'),
    ])

    return stored
  } catch {
    // Corrupted or incompatible discard and regenerate.
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

  const fresh = await generateAndExportKeyPair()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
  return fresh
}

/**
 * Remove the persisted key pair from localStorage.
 *
 * Use this for explicit logout flows or in tests that need a clean slate.
 * Note: clearing the persisted key pair does NOT invalidate any JWTs already
 * issued with the old key — the backend will reject them once the key is gone.
 * Always pair this with a fresh tenant registration if the backend enforces
 * key-bound authentication.
 *
 * This function only removes the localStorage entry; it does NOT reset the
 * in-memory `keyPairPromise` cache in `authService`. Call
 * `resetAuthState()` from `authService` alongside this function to ensure
 * a fully clean auth state.
 */
export function clearPersistedKeyPair(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export async function createJwt(
  tenantId: string,
  keyPair: StoredKeyPair,
  ttlSeconds = 3600
): Promise<string> {
  const privateKey = await importJWK(keyPair.privateKeyJwk, 'ES256')

  const iat = Math.floor(Date.now() / 1000)

  return new SignJWT({ sub: tenantId })
    .setProtectedHeader({
      alg: 'ES256',
      typ: 'JWT',
      jwk: keyPair.publicKeyJwk,
    })
    .setIssuedAt(iat)
    .setExpirationTime(iat + ttlSeconds)
    .sign(privateKey)
}
