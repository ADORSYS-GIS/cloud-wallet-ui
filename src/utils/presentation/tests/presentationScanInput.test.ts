import { describe, expect, it } from 'vitest'
import { parsePresentationScanInput } from '../presentationScanInput'

const baseQuery =
  'client_id=https%3A%2F%2Fverifier.example' +
  '&request_uri=https%3A%2F%2Fverifier.example%2Frequest' +
  '&response_type=vp_token' +
  '&nonce=nonce-123' +
  '&scope=openid'

describe('parsePresentationScanInput', () => {
  it('returns the raw query string for POST /presentation/start', () => {
    const result = parsePresentationScanInput(baseQuery)
    expect(result).toEqual({
      ok: true,
      request: baseQuery,
    })
  })

  it('parses openid4vp QR URIs', () => {
    const input = `openid4vp://?${baseQuery}`
    const result = parsePresentationScanInput(input)
    expect(result?.ok).toBe(true)
    if (result?.ok) {
      expect(result.request).toBe(input)
    }
  })

  it('parses https QR URIs', () => {
    const input = `https://wallet.example/present?${baseQuery}`
    const result = parsePresentationScanInput(input)
    expect(result?.ok).toBe(true)
    if (result?.ok) {
      expect(result.request).toBe(input)
    }
  })

  it('returns a validation error for malformed presentation requests', () => {
    const result = parsePresentationScanInput('client_id=verifier&response_type=vp_token')
    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'invalid_request',
        message: expect.stringContaining('request_uri'),
      }),
    })
  })

  it('returns null for unrecognized input', () => {
    expect(parsePresentationScanInput('not-a-presentation-qr')).toBeNull()
    expect(parsePresentationScanInput('client_id=only-client')).toBeNull()
  })

  it('returns null for issuance QR codes', () => {
    expect(
      parsePresentationScanInput(
        'openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fissuer.example%2Foffer'
      )
    ).toBeNull()
  })
})
