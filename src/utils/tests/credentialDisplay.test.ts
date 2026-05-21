import { describe, expect, it } from 'vitest'
import type { CredentialRecord } from '../../types/credential'
import type { IssuerDisplayEntry } from '../../types/issuance'
import {
  credentialDisplayName,
  issuerDisplayLabel,
  resolveIssuerDisplay,
} from '../credentialDisplay'

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

describe('resolveIssuerDisplay', () => {
  const defaultCredentialIssuer = 'https://issuer.example.com'

  it('uses hostname from credentialIssuer and logo from the first display entry', () => {
    const display: IssuerDisplayEntry[] = [
      {
        name: 'Example Issuer',
        locale: 'en-US',
        logo: { uri: 'https://issuer.example.com/logo.png', alt_text: 'Logo' },
        description: 'An example issuer',
      },
    ]
    const result = resolveIssuerDisplay(display, defaultCredentialIssuer)
    // When credentialIssuer is provided, hostname takes precedence over display name
    expect(result.name).toBe('issuer.example.com')
    expect(result.logoUri).toBe('https://issuer.example.com/logo.png')
  })

  it('falls back to hostname when first entry has no name', () => {
    const credentialIssuer = 'https://wallet-issuer.example.org/path'
    const display: IssuerDisplayEntry[] = [
      {
        logo: { uri: 'https://issuer.example.com/logo.png', alt_text: 'Logo' },
      },
    ]
    const result = resolveIssuerDisplay(display, credentialIssuer)
    expect(result.name).toBe('wallet-issuer.example.org')
    expect(result.logoUri).toBe('https://issuer.example.com/logo.png')
  })

  it('falls back to hostname when display array is empty', () => {
    const credentialIssuer = 'https://wallet-issuer.example.org'
    const display: IssuerDisplayEntry[] = []
    const result = resolveIssuerDisplay(display, credentialIssuer)
    expect(result.name).toBe('wallet-issuer.example.org')
    expect(result.logoUri).toBeNull()
  })

  it('uses hostname from credentialIssuer when provided, ignoring display name', () => {
    const display: IssuerDisplayEntry[] = [{ name: 'Example Issuer', locale: 'en-US' }]
    const result = resolveIssuerDisplay(display, defaultCredentialIssuer)
    // When credentialIssuer is provided, hostname takes precedence over display name
    expect(result.name).toBe('issuer.example.com')
    expect(result.logoUri).toBeNull()
  })

  it('uses hostname from credentialIssuer when display entry has only name', () => {
    const display: IssuerDisplayEntry[] = [{ name: 'Minimal Issuer' }]
    const result = resolveIssuerDisplay(display, defaultCredentialIssuer)
    // When credentialIssuer is provided, hostname takes precedence over display name
    expect(result.name).toBe('issuer.example.com')
    expect(result.logoUri).toBeNull()
  })

  it('uses hostname from credentialIssuer when multiple display entries exist', () => {
    const display: IssuerDisplayEntry[] = [
      { name: 'First Entry', locale: 'en-US' },
      { name: 'Second Entry', locale: 'de-DE' },
    ]
    const result = resolveIssuerDisplay(display, defaultCredentialIssuer)
    // When credentialIssuer is provided, hostname takes precedence over display names
    expect(result.name).toBe('issuer.example.com')
  })

  it('uses display name when credentialIssuer is not provided', () => {
    const display: IssuerDisplayEntry[] = [{ name: 'Example Issuer', locale: 'en-US' }]
    const result = resolveIssuerDisplay(display, undefined)
    // When no credentialIssuer, use display name
    expect(result.name).toBe('Example Issuer')
    expect(result.logoUri).toBeNull()
  })
})
