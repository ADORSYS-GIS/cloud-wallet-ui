import { describe, expect, it } from 'vitest'
import { parsePresentationScanInput } from '../presentationScanInput'

const baseQuery =
  'client_id=https%3A%2F%2Fverifier.example' +
  '&request_uri=https%3A%2F%2Fverifier.example%2Frequest' +
  '&response_type=vp_token' +
  '&nonce=nonce-123' +
  '&scope=openid'

describe('parsePresentationScanInput', () => {
  it('parses a raw query string from a QR code', () => {
    const result = parsePresentationScanInput(baseQuery)
    expect(result).toBe(`/present?${baseQuery}`)
  })

  it('returns null for deep-link style URIs', () => {
    expect(parsePresentationScanInput(`openid4vp://?${baseQuery}`)).toBeNull()
    expect(
      parsePresentationScanInput(`https://wallet.example/present?${baseQuery}`)
    ).toBeNull()
  })

  it('returns null for unrecognized input', () => {
    expect(parsePresentationScanInput('not-a-presentation-qr')).toBeNull()
    expect(parsePresentationScanInput('client_id=only-client')).toBeNull()
  })
})
