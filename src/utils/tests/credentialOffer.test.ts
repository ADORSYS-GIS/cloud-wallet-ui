import { describe, expect, it, vi } from 'vitest'
import { parseCredentialOfferInput } from '../credentialOffer'

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
    expect(parsed?.normalizedUri).toContain(
      'openid-credential-offer://?credential_offer_uri='
    )
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
    expect(parsed?.normalizedUri).toContain(
      'openid-credential-offer://?credential_offer='
    )
  })

  it('accepts localhost HTTP credential_issuer for dev', () => {
    const offer = encodeURIComponent(
      JSON.stringify({
        credential_issuer: 'http://localhost:8080',
        credential_configuration_ids: ['MyCredential'],
      })
    )
    const input = `openid-credential-offer://?credential_offer=${offer}`

    const parsed = parseCredentialOfferInput(input)
    expect(parsed).not.toBeNull()
  })

  it('still rejects non-localhost HTTP credential_issuer', () => {
    const offer = encodeURIComponent(
      JSON.stringify({
        credential_issuer: 'http://issuer.example.com',
        credential_configuration_ids: ['MyCredential'],
      })
    )
    const input = `openid-credential-offer://?credential_offer=${offer}`

    expect(parseCredentialOfferInput(input)).toBeNull()
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
    vi.stubEnv(
      'VITE_ALLOWED_CREDENTIAL_OFFER_HOSTS',
      'issuer.example.com, wallet.example.org'
    )

    expect(
      parseCredentialOfferInput('https://evil.example.com/credential-offer/123')
    ).toBeNull()

    const parsed = parseCredentialOfferInput(
      'https://issuer.example.com/credential-offer/123'
    )
    expect(parsed).not.toBeNull()
  })

  it('rejects credential_offer objects with invalid credential_configuration_ids types', () => {
    const offer = encodeURIComponent(
      JSON.stringify({
        credential_issuer: 'https://issuer.example.com',
        credential_configuration_ids: ['valid-id', 123],
      })
    )
    const input = `openid-credential-offer://?credential_offer=${offer}`

    expect(parseCredentialOfferInput(input)).toBeNull()
  })

  it('accepts allowlisted hosts regardless of path shape', () => {
    vi.stubEnv('VITE_ALLOWED_CREDENTIAL_OFFER_HOSTS', 'issuer.example.com')
    const parsed = parseCredentialOfferInput(
      'https://issuer.example.com/not-an-offer-path'
    )
    expect(parsed).not.toBeNull()
  })

  it('rejects openid-credential-offer URI with insecure credential_offer_uri', () => {
    const input =
      'openid-credential-offer://?credential_offer_uri=' +
      encodeURIComponent('http://issuer.example.com/credential-offer/abc')
    expect(parseCredentialOfferInput(input)).toBeNull()
  })

  it('rejects openid-credential-offer URI with no params', () => {
    expect(parseCredentialOfferInput('openid-credential-offer://')).toBeNull()
  })

  it('rejects openid-credential-offer URI with unrelated params only', () => {
    expect(parseCredentialOfferInput('openid-credential-offer://?foo=bar')).toBeNull()
  })

  it('rejects credential_offer payloads that decode to non-objects', () => {
    const payload = encodeURIComponent('"just-a-string"')
    expect(
      parseCredentialOfferInput(`openid-credential-offer://?credential_offer=${payload}`)
    ).toBeNull()
  })

  it('rejects malformed encoded credential_offer payload', () => {
    expect(
      parseCredentialOfferInput('openid-credential-offer://?credential_offer=%E0%A4%A')
    ).toBeNull()
  })

  it('rejects unsupported URL schemes', () => {
    expect(
      parseCredentialOfferInput('ftp://issuer.example.com/credential-offer/1')
    ).toBeNull()
  })

  it('rejects credential_offer payload with invalid credential_issuer URL', () => {
    const offer = encodeURIComponent(
      JSON.stringify({
        credential_issuer: 'not-a-valid-url',
        credential_configuration_ids: ['MyCredential'],
      })
    )
    expect(
      parseCredentialOfferInput(`openid-credential-offer://?credential_offer=${offer}`)
    ).toBeNull()
  })
})
