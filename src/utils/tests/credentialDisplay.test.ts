import { describe, expect, it } from 'vitest'
import type { CredentialRecord } from '../../types/credential'
import { credentialDisplayName, issuerDisplayLabel } from '../credentialDisplay'

function makeCredential(overrides: Partial<CredentialRecord> = {}): CredentialRecord {
  return {
    id: 'cred-1',
    credential_configuration_id: 'https://credentials.example.com/identity/mDL',
    format: 'dc+sd-jwt',
    issuer: 'https://issuer.example.com',
    status: 'active',
    issued_at: '2026-04-08T14:35:00Z',
    expires_at: null,
    claims: {},
    ...overrides,
  }
}

describe('credentialDisplayName', () => {
  it('returns the last path segment of a URL-style credential_configuration_id', () => {
    const c = makeCredential({
      credential_configuration_id: 'https://credentials.example.com/identity/mDL',
    })
    expect(credentialDisplayName(c)).toBe('mDL')
  })

  it('returns the whole value when the id has no path segments', () => {
    const c = makeCredential({
      credential_configuration_id: 'eu.europa.ec.eudi.pid.1',
    })
    expect(credentialDisplayName(c)).toBe('eu.europa.ec.eudi.pid.1')
  })

  it('strips trailing slashes before extracting the segment', () => {
    const c = makeCredential({
      credential_configuration_id: 'https://credentials.example.com/identity/mDL/',
    })
    expect(credentialDisplayName(c)).toBe('mDL')
  })

  it('falls back to "Credential" when the id is an empty string', () => {
    const c = makeCredential({ credential_configuration_id: '' })
    expect(credentialDisplayName(c)).toBe('Credential')
  })
})

describe('issuerDisplayLabel', () => {
  it('returns host for an https issuer URL', () => {
    expect(issuerDisplayLabel('https://wallet-issuer.example.com/path')).toBe(
      'wallet-issuer.example.com'
    )
  })

  it('returns raw string when not a valid URL', () => {
    expect(issuerDisplayLabel('did:example:123')).toBe('did:example:123')
  })

  it('returns raw string for malformed URL input', () => {
    expect(issuerDisplayLabel('not a valid URL %%')).toBe('not a valid URL %%')
  })

  it('returns host including port when present', () => {
    expect(issuerDisplayLabel('https://issuer.example.com:8443/oid4vci')).toBe(
      'issuer.example.com:8443'
    )
  })
})
