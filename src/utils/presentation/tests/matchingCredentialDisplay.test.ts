import { describe, expect, it } from 'vitest'
import { resolveMatchingCredentialDisplay } from '../matchingCredentialDisplay'

describe('resolveMatchingCredentialDisplay', () => {
  it('prefers display metadata from the backend', () => {
    const result = resolveMatchingCredentialDisplay({
      credentialId: 'cred-1',
      queryId: 'identity',
      format: 'dc+sd-jwt',
      display: {
        name: 'Identity Credential',
        issuer_name: 'Keycloak-demo Solution Adorsys',
        logo: {
          uri: 'https://issuer.example/logo.png',
          alt_text: 'Issuer logo',
        },
      },
    })

    expect(result).toEqual({
      name: 'Identity Credential',
      issuerName: 'Keycloak-demo Solution Adorsys',
      logoUri: 'https://issuer.example/logo.png',
      description: undefined,
      backgroundColor: undefined,
      backgroundImage: undefined,
      textColor: undefined,
    })
  })

  it('falls back to displayName and defaults when display is absent', () => {
    const result = resolveMatchingCredentialDisplay({
      credentialId: 'cred-1',
      queryId: 'identity',
      format: 'dc+sd-jwt',
      displayName: 'Legacy Name',
    })

    expect(result.name).toBe('Legacy Name')
    expect(result.issuerName).toBe('Unknown Issuer')
    expect(result.logoUri).toBeNull()
  })
})
