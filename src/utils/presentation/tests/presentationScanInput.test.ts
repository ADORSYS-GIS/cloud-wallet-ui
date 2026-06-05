import { describe, expect, it } from 'vitest'
import { parsePresentationScanInput } from '../presentationScanInput'

const baseQuery =
  'client_id=https%3A%2F%2Fverifier.example' +
  '&request_uri=https%3A%2F%2Fverifier.example%2Frequest' +
  '&response_type=vp_token' +
  '&nonce=nonce-123' +
  '&scope=openid'

describe('parsePresentationScanInput', () => {
  it('parses an https presentation QR into an internal /present route', () => {
    const result = parsePresentationScanInput(
      `https://wallet.example/present?${baseQuery}`
    )
    expect(result).toBe(`/present?${baseQuery}`)
  })

  it('parses an openid4vp:// scheme link', () => {
    const result = parsePresentationScanInput(`openid4vp://?${baseQuery}`)
    expect(result).toBe(`/present?${baseQuery}`)
  })

  it('parses a raw query string from a QR code', () => {
    const result = parsePresentationScanInput(baseQuery)
    expect(result).toBe(`/present?${baseQuery}`)
  })

  it('returns null for unrecognized input', () => {
    expect(parsePresentationScanInput('not-a-presentation-qr')).toBeNull()
    expect(parsePresentationScanInput('client_id=only-client')).toBeNull()
  })
})
