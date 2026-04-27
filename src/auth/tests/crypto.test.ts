// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { importJWK, jwtVerify, decodeProtectedHeader, decodeJwt } from 'jose'
import { getOrCreateKeyPair, createJwt } from '../crypto'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key]
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(store)) delete store[k]
  }),
}

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock)
  localStorageMock.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getOrCreateKeyPair', () => {
  it('generates a key pair with the expected JWK fields', async () => {
    const kp = await getOrCreateKeyPair()
    expect(kp.publicKeyJwk.kty).toBe('EC')
    expect(kp.publicKeyJwk.crv).toBe('P-256')
    expect(typeof kp.publicKeyJwk.x).toBe('string')
    expect(typeof kp.publicKeyJwk.y).toBe('string')
    // Private key must not be present in the public JWK
    expect((kp.publicKeyJwk as unknown as Record<string, unknown>).d).toBeUndefined()
    // Private JWK must have 'd' component
    expect(typeof kp.privateKeyJwk.d).toBe('string')
  })

  it('persists the key pair to localStorage under the bearer_token_keypair key', async () => {
    await getOrCreateKeyPair()
    expect(localStorageMock.setItem).toHaveBeenCalledOnce()
    const stored = JSON.parse(store['bearer_token_keypair']) as unknown
    expect(stored).toHaveProperty('publicKeyJwk')
    expect(stored).toHaveProperty('privateKeyJwk')
  })

  it('returns the same key pair on subsequent calls (from localStorage)', async () => {
    const first = await getOrCreateKeyPair()
    const second = await getOrCreateKeyPair()
    // The public key x/y coordinates must be identical
    expect(first.publicKeyJwk.x).toBe(second.publicKeyJwk.x)
    expect(first.publicKeyJwk.y).toBe(second.publicKeyJwk.y)
  })

  it('regenerates if stored value is corrupted', async () => {
    store['bearer_token_keypair'] = 'not-valid-json{'
    const kp = await getOrCreateKeyPair()
    expect(kp.publicKeyJwk.kty).toBe('EC')
    // Should have saved a fresh pair
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })
})

describe('createJwt', () => {
  it('produces a three-part compact JWT', async () => {
    const kp = await getOrCreateKeyPair()
    const token = await createJwt('tenant-123', kp)
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
  })

  it('header contains alg=ES256, typ=JWT and the public key JWK', async () => {
    const kp = await getOrCreateKeyPair()
    const token = await createJwt('tenant-abc', kp)
    const header = decodeProtectedHeader(token)
    expect(header.alg).toBe('ES256')
    expect(header.typ).toBe('JWT')
    expect(header.jwk).toMatchObject({ kty: 'EC', crv: 'P-256' })
    // Public JWK must not contain the private 'd' param
    expect((header.jwk as Record<string, unknown>).d).toBeUndefined()
  })

  it('payload contains sub, iat and exp claims', async () => {
    const kp = await getOrCreateKeyPair()
    const before = Math.floor(Date.now() / 1000)
    const token = await createJwt('tenant-xyz', kp, 1800)
    const payload = decodeJwt(token)
    expect(payload.sub).toBe('tenant-xyz')
    expect(typeof payload.iat).toBe('number')
    expect(typeof payload.exp).toBe('number')
    expect((payload.exp as number) - (payload.iat as number)).toBe(1800)
    expect(payload.iat as number).toBeGreaterThanOrEqual(before)
  })

  it('produces a verifiable signature with the corresponding public key', async () => {
    const kp = await getOrCreateKeyPair()
    const token = await createJwt('tenant-verify', kp)
    const publicKey = await importJWK(kp.publicKeyJwk, 'ES256')
    // jwtVerify throws if the signature is invalid — a clean pass means it verified.
    const { payload } = await jwtVerify(token, publicKey)
    expect(payload.sub).toBe('tenant-verify')
  })
})
