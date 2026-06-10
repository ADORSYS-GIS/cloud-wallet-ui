import { describe, expect, it } from 'vitest'
import { verifierDisplayName, verifierLogoUri, verifierPurpose } from '../verifierDisplay'
import type { VerifierMetadata } from '../../../types/presentation'

describe('verifierDisplay', () => {
  it('prefers resolved verifier name', () => {
    const verifier: VerifierMetadata = {
      client_id: 'https://verifier.example',
      name: 'Keycloak-demo',
    }
    expect(verifierDisplayName(verifier)).toBe('Keycloak-demo')
  })

  it('falls back to client_metadata name', () => {
    const verifier: VerifierMetadata = {
      client_id: 'x509_san_dns:verifier.example',
      client_metadata: { client_name: 'Example Bank' },
    }
    expect(verifierDisplayName(verifier)).toBe('Example Bank')
  })

  it('falls back to client_id host', () => {
    const verifier: VerifierMetadata = {
      client_id: 'https://verifier.example/callback',
    }
    expect(verifierDisplayName(verifier)).toBe('verifier.example')
  })

  it('reads logo and purpose from metadata', () => {
    const verifier: VerifierMetadata = {
      client_id: 'https://verifier.example',
      client_metadata: {
        logo_uri: 'https://verifier.example/logo.png',
        purpose: 'Age verification for service access',
      },
    }
    expect(verifierLogoUri(verifier)).toBe('https://verifier.example/logo.png')
    expect(verifierPurpose(verifier)).toBe('Age verification for service access')
  })
})
