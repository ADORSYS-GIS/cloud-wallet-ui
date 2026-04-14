// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createBearerToken, generateKeyPair, importPrivateKey } from '../crypto'

// ---------------------------------------------------------------------------
// generateKeyPair
// ---------------------------------------------------------------------------

describe('generateKeyPair', () => {
  it('returns a publicKeyJwk and privateKeyJwk', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateKeyPair()

    expect(publicKeyJwk.kty).toBe('EC')
    expect(publicKeyJwk.crv).toBe('P-256')
    expect(publicKeyJwk.key_ops).toContain('verify')

    expect(privateKeyJwk.kty).toBe('EC')
    expect(privateKeyJwk.crv).toBe('P-256')
    expect(privateKeyJwk.key_ops).toContain('sign')
  })

  it('produces different key pairs on each call', async () => {
    const a = await generateKeyPair()
    const b = await generateKeyPair()
    // The `x` coordinate of the public key uniquely identifies the key
    expect(a.publicKeyJwk.x).not.toBe(b.publicKeyJwk.x)
  })
})

// ---------------------------------------------------------------------------
// importPrivateKey
// ---------------------------------------------------------------------------

describe('importPrivateKey', () => {
  it('imports a JWK exported by generateKeyPair without throwing', async () => {
    const { privateKeyJwk } = await generateKeyPair()
    const key = await importPrivateKey(privateKeyJwk)

    expect(key.type).toBe('private')
    expect(key.algorithm).toMatchObject({ name: 'ECDSA' })
    expect(key.usages).toContain('sign')
  })
})

// ---------------------------------------------------------------------------
// createBearerToken
// ---------------------------------------------------------------------------

describe('createBearerToken', () => {
  it('returns a three-part dot-separated JWT string', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateKeyPair()
    const privateKey = await importPrivateKey(privateKeyJwk)

    const token = await createBearerToken('tenant-uuid-123', privateKey, publicKeyJwk)
    const parts = token.split('.')
    expect(parts).toHaveLength(3)
  })

  it('header contains alg=ES256, typ=JWT, and the public key JWK', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateKeyPair()
    const privateKey = await importPrivateKey(privateKeyJwk)

    const token = await createBearerToken('tenant-uuid-123', privateKey, publicKeyJwk)
    const [headerB64] = token.split('.')

    const padded = headerB64.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='))
    const header = JSON.parse(json) as Record<string, unknown>

    expect(header['alg']).toBe('ES256')
    expect(header['typ']).toBe('JWT')
    expect(header['jwk']).toMatchObject({ kty: 'EC', crv: 'P-256' })
  })

  it('payload contains sub, iat, exp with correct tenant_id', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateKeyPair()
    const privateKey = await importPrivateKey(privateKeyJwk)

    const beforeSec = Math.floor(Date.now() / 1000)
    const token = await createBearerToken('my-tenant-id', privateKey, publicKeyJwk)
    const afterSec = Math.floor(Date.now() / 1000)

    const [, payloadB64] = token.split('.')
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='))
    const payload = JSON.parse(json) as Record<string, unknown>

    expect(payload['sub']).toBe('my-tenant-id')
    expect(typeof payload['iat']).toBe('number')
    expect(typeof payload['exp']).toBe('number')
    expect(payload['iat'] as number).toBeGreaterThanOrEqual(beforeSec)
    expect(payload['iat'] as number).toBeLessThanOrEqual(afterSec)
    // Default TTL is 300 s
    expect((payload['exp'] as number) - (payload['iat'] as number)).toBe(300)
  })

  it('honours a custom ttlSeconds', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateKeyPair()
    const privateKey = await importPrivateKey(privateKeyJwk)

    const token = await createBearerToken('t', privateKey, publicKeyJwk, 60)
    const [, payloadB64] = token.split('.')
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '='))
    const payload = JSON.parse(json) as Record<string, unknown>

    expect((payload['exp'] as number) - (payload['iat'] as number)).toBe(60)
  })

  it('produces a signature verifiable with the corresponding public key', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateKeyPair()
    const privateKey = await importPrivateKey(privateKeyJwk)
    const publicKey = await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    )

    const token = await createBearerToken('tenant-id', privateKey, publicKeyJwk)
    const [headerB64, payloadB64, signatureB64] = token.split('.')

    const sigPadded = signatureB64.replace(/-/g, '+').replace(/_/g, '/')
    const sigBinary = atob(
      sigPadded.padEnd(sigPadded.length + ((4 - (sigPadded.length % 4)) % 4), '=')
    )
    const sigBuffer = new Uint8Array(sigBinary.length)
    for (let i = 0; i < sigBinary.length; i++) {
      sigBuffer[i] = sigBinary.charCodeAt(i)
    }

    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)

    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      sigBuffer,
      signingInput
    )

    expect(valid).toBe(true)
  })
})