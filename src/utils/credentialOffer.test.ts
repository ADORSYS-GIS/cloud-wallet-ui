import { describe, expect, it, vi } from 'vitest'
import { parseCredentialOfferInput } from './credentialOffer'

describe('parseCredentialOfferInput', () => {
  it('returns null for empty/whitespace input', () => {
    expect(parseCredentialOfferInput('')).toBeNull()
    expect(parseCredentialOfferInput('   ')).toBeNull()
  })

  it('parses openid-credential-offer credential_offer_uri (https)', () => {
    const input =
      'openid-credential-offer://?credential_offer_uri=' +
      encodeURIComponent('https://issuer.example.com/credential-offer/abc')

    const parsed = parseCredentialOfferInput(input)
    expect(parsed).not.toBeNull()
    expect(parsed?.normalizedUri).toContain('openid-credential-offer://?credential_offer_uri=')
  })

  it('rejects openid-credential-offer when both credential_offer and credential_offer_uri are present', () => {
    const input =
      'openid-credential-offer://?credential_offer_uri=' +
      encodeURIComponent('https://issuer.example.com/credential-offer/abc') +
      '&credential_offer=' +
      encodeURIComponent(
        JSON.stringify({
          credential_issuer: 'https://issuer.example.com',
          credential_configuration_ids: ['MyCredential'],
        })
      )

    expect(parseCredentialOfferInput(input)).toBeNull()
  })

  it('parses openid-credential-offer credential_offer (by value)', () => {
    const offer = encodeURIComponent(
      JSON.stringify({
        credential_issuer: 'https://issuer.example.com',
        credential_configuration_ids: ['MyCredential'],
      })
    )
    const input = `openid-credential-offer://?credential_offer=${offer}`

    const parsed = parseCredentialOfferInput(input)
    expect(parsed).not.toBeNull()
    expect(parsed?.normalizedUri).toContain('openid-credential-offer://?credential_offer=')
  })

  it('rejects non-url input', () => {
    expect(parseCredentialOfferInput('not a url')).toBeNull()
  })

  it('rejects plain https URLs that do not look like a credential offer (default)', () => {
    // Default is conservative: only accept if pathname contains "credential-offer".
    expect(parseCredentialOfferInput('https://example.com/')).toBeNull()
    expect(parseCredentialOfferInput('https://example.com/some/other/qr')).toBeNull()
  })

  it('accepts plain https URLs whose path looks like a credential offer (default)', () => {
    const parsed = parseCredentialOfferInput('https://example.com/credential-offer/123')
    expect(parsed).not.toBeNull()
    expect(parsed?.normalizedUri).toContain(
      encodeURIComponent('https://example.com/credential-offer/123')
    )
  })

  it('enforces allowlisted hosts when configured', () => {
    vi.stubEnv('VITE_ALLOWED_CREDENTIAL_OFFER_HOSTS', 'issuer.example.com, wallet.example.org')

    expect(parseCredentialOfferInput('https://evil.example.com/credential-offer/123')).toBeNull()

    const parsed = parseCredentialOfferInput('https://issuer.example.com/credential-offer/123')
    expect(parsed).not.toBeNull()
  })
})

