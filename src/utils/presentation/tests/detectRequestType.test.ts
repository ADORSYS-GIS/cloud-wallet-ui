import { describe, expect, it } from 'vitest'
import { detectRequestType } from '../detectRequestType'

describe('detectRequestType', () => {
  it('detects presentation requests by request_uri', () => {
    expect(
      detectRequestType(
        'client_id=verifier&request_uri=https%3A%2F%2Fverifier.example%2Frequest'
      )
    ).toBe('presentation')
  })

  it('detects presentation requests by dcql_query', () => {
    expect(
      detectRequestType('client_id=verifier&dcql_query=%7B%22credentials%22%3A%5B%5D%7D')
    ).toBe('presentation')
  })

  it('detects presentation requests by presentation_definition', () => {
    expect(
      detectRequestType(
        'client_id=verifier&presentation_definition=%7B%22id%22%3A%22test%22%7D'
      )
    ).toBe('presentation')
  })

  it('detects presentation requests by request JWT parameter', () => {
    expect(detectRequestType('client_id=verifier&request=eyJhbG.a.b')).toBe(
      'presentation'
    )
  })

  it('detects presentation requests by client_id and response_type', () => {
    expect(detectRequestType('client_id=verifier&response_type=vp_token')).toBe(
      'presentation'
    )
  })

  it('detects issuance requests by credential_offer_uri', () => {
    expect(
      detectRequestType(
        'openid-credential-offer://?credential_offer_uri=https%3A%2F%2Fissuer.example%2Foffer'
      )
    ).toBe('issuance')
  })

  it('detects issuance requests by credential_offer', () => {
    expect(detectRequestType('openid-credential-offer://?credential_offer=%7B%7D')).toBe(
      'issuance'
    )
  })

  it('returns unknown for unrecognized content', () => {
    expect(detectRequestType('not-a-qr-code')).toBe('unknown')
    expect(detectRequestType('client_id=only-client')).toBe('unknown')
  })
})
