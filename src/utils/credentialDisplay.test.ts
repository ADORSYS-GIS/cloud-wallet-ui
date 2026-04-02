import { describe, expect, it } from 'vitest'
import type { CredentialSummary } from '../types/credential'
import { credentialDisplayName, issuerDisplayLabel } from './credentialDisplay'

describe('credentialDisplayName', () => {
  it('prefers display_name when set', () => {
    const c: CredentialSummary = {
      id: '1',
      issuer: 'https://issuer.example',
      credential_type: 'https://example/vct/PID',
      display_name: 'Personal ID',
    }
    expect(credentialDisplayName(c)).toBe('Personal ID')
  })

  it('uses last path segment of credential_type when no display name', () => {
    const c: CredentialSummary = {
      id: '1',
      issuer: 'https://issuer.example',
      credential_type: 'https://credentials.example.com/identity/mDL',
    }
    expect(credentialDisplayName(c)).toBe('mDL')
  })
})

describe('issuerDisplayLabel', () => {
  it('returns host for https issuer URL', () => {
    expect(issuerDisplayLabel('https://wallet-issuer.example.com/path')).toBe(
      'wallet-issuer.example.com'
    )
  })

  it('returns raw string when not a URL', () => {
    expect(issuerDisplayLabel('did:example:123')).toBe('did:example:123')
  })
})
